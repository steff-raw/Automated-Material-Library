#include "RfidReader.h"

#include <SPI.h>
#include <Adafruit_PN532.h>

#include "config.h"

static Adafruit_PN532 nfc(PN532_SCK, PN532_MISO, PN532_MOSI, PN532_SS);

static bool readNtagPage(uint8_t page, uint8_t* data) {
  for (uint8_t attempt = 0; attempt < 3; attempt++) {
    if (nfc.ntag2xx_ReadPage(page, data)) {
      return true;
    }
    delay(20);
  }
  return false;
}

bool RfidReader::begin() {
  nfc.begin();

  uint32_t versiondata = nfc.getFirmwareVersion();
  if (!versiondata) {
    Serial.println(F("[RFID] PN532 not found — check SPI wiring"));
    ready_ = false;
    return false;
  }

  Serial.print(F("[RFID] Found PN532 chip, firmware "));
  Serial.print((versiondata >> 24) & 0xFF, DEC);
  Serial.print('.');
  Serial.println((versiondata >> 16) & 0xFF, DEC);

  nfc.SAMConfig();
  ready_ = true;
  Serial.println(F("[RFID] Ready"));
  return true;
}

bool RfidReader::readUidHex(String& outUidHex) {
  if (!ready_) {
    return false;
  }

  uint8_t uid[7] = {0};
  uint8_t uidLength = 0;

  // timeoutMs=50 keeps the loop responsive for WiFi housekeeping
  if (!nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength, 50)) {
    return false;
  }

  outUidHex = "";
  outUidHex.reserve(uidLength * 2);
  for (uint8_t i = 0; i < uidLength; i++) {
    if (uid[i] < 0x10) {
      outUidHex += '0';
    }
    outUidHex += String(uid[i], HEX);
  }
  outUidHex.toUpperCase();
  return true;
}

bool RfidReader::writeElementIdForCurrentTag(const String& uidHex) {
  if (!ready_) {
    return false;
  }

  uint8_t capabilityContainer[4] = {0};
  const bool capabilityRead = readNtagPage(3, capabilityContainer);
  Serial.print(F("[RFID] Capability page 3: "));
  Serial.print(capabilityRead ? F("read ") : F("read failed "));
  for (uint8_t index = 0; index < 4; index++) {
    if (capabilityContainer[index] < 0x10) {
      Serial.print('0');
    }
    Serial.print(capabilityContainer[index], HEX);
    Serial.print(index == 3 ? '\n' : ' ');
  }
  if (!capabilityRead || capabilityContainer[0] != 0xE1 ||
      (capabilityContainer[1] & 0xF0) != 0x10 || capabilityContainer[2] == 0) {
    Serial.println(F("[RFID] Write skipped: tag is not a supported Type-2 NDEF tag"));
    return false;
  }

  const String elementId = "AML-" + uidHex;
  const uint8_t textLength = static_cast<uint8_t>(elementId.length());
  const uint8_t recordLength = 7 + textLength;
  uint8_t tlv[32] = {0};
  const uint8_t tlvLength = recordLength + 3;
  if (tlvLength > sizeof(tlv)) {
    Serial.println(F("[RFID] Write skipped: tag has insufficient NDEF capacity"));
    return false;
  }

  tlv[0] = 0x03;
  tlv[1] = recordLength;
  tlv[2] = 0xD1;
  tlv[3] = 0x01;
  tlv[4] = textLength + 3;
  tlv[5] = 0x54;
  tlv[6] = 0x02;
  tlv[7] = 'e';
  tlv[8] = 'n';
  for (uint8_t index = 0; index < textLength; index++) {
    tlv[9 + index] = elementId[index];
  }
  tlv[2 + recordLength] = 0xFE;

  uint8_t existing[48] = {0};
  for (uint8_t page = 0; page < 2; page++) {
    if (!readNtagPage(4 + page, existing + page * 4)) {
      Serial.print(F("[RFID] User memory read failed at page "));
      Serial.println(4 + page);
      Serial.println(F("[RFID] Write skipped: could not read tag user memory"));
      return false;
    }
  }

  bool firstPagesBlank = true;
  for (uint8_t index = 0; index < 8; index++) {
    if (existing[index] != 0) {
      firstPagesBlank = false;
      break;
    }
  }
  const bool emptyNdef = existing[0] == 0x03 && existing[1] == 0x00 &&
                         existing[2] == 0xFE && existing[3] == 0x00;
  const bool emptyNdefWithLockControl =
      existing[0] == 0x01 && existing[1] == 0x03 && existing[2] == 0xA0 &&
      existing[3] == 0x0C && existing[4] == 0x34 && existing[5] == 0x03 &&
      existing[6] == 0x00 && existing[7] == 0xFE;

  uint8_t ndefOffset = 0;
  if (emptyNdefWithLockControl) {
    ndefOffset = 5;
  } else if (!firstPagesBlank && !emptyNdef) {
    Serial.print(F("[RFID] Unrecognized user prefix:"));
    for (uint8_t index = 0; index < 8; index++) {
      if ((index % 4) == 0) {
        Serial.print(' ');
      }
      if (existing[index] < 0x10) {
        Serial.print('0');
      }
      Serial.print(existing[index], HEX);
    }
    Serial.println();
    Serial.println(F("[RFID] Write skipped: tag has existing or unrecognized data"));
    return false;
  }

  const uint16_t requiredLength = ndefOffset + tlvLength;
  if (requiredLength > capabilityContainer[2] * 8) {
    Serial.println(F("[RFID] Write skipped: tag has insufficient NDEF capacity"));
    return false;
  }

  const uint8_t pageCount = (requiredLength + 3) / 4;
  const uint8_t storageLength = pageCount * 4;
  for (uint8_t page = 2; page < pageCount; page++) {
    if (!readNtagPage(4 + page, existing + page * 4)) {
      Serial.print(F("[RFID] User memory read failed at page "));
      Serial.println(4 + page);
      Serial.println(F("[RFID] Write skipped: could not read tag user memory"));
      return false;
    }
  }

  bool dataAreaBlank = true;
  for (uint8_t index = emptyNdefWithLockControl ? 8 : (emptyNdef ? 4 : 0);
       index < storageLength; index++) {
    if (existing[index] != 0) {
      dataAreaBlank = false;
      break;
    }
  }
  if (!firstPagesBlank && !dataAreaBlank) {
    Serial.print(F("[RFID] Existing user memory:"));
    for (uint8_t index = 0; index < storageLength; index++) {
      if ((index % 4) == 0) {
        Serial.print(' ');
      }
      if (existing[index] < 0x10) {
        Serial.print('0');
      }
      Serial.print(existing[index], HEX);
    }
    Serial.println();
    Serial.println(F("[RFID] Write skipped: tag has existing or unrecognized data"));
    return false;
  }

  uint8_t updated[48] = {0};
  memcpy(updated, existing, storageLength);
  memcpy(updated + ndefOffset, tlv, tlvLength);
  for (uint8_t page = 0; page < pageCount; page++) {
    if (!nfc.ntag2xx_WritePage(4 + page, updated + page * 4)) {
      Serial.println(F("[RFID] Write failed while writing tag pages"));
      return false;
    }
  }

  uint8_t verifyPage[4] = {0};
  for (uint8_t page = 0; page < pageCount; page++) {
    if (!readNtagPage(4 + page, verifyPage)) {
      Serial.println(F("[RFID] Write failed: could not verify tag"));
      return false;
    }
    for (uint8_t byteIndex = 0; byteIndex < 4; byteIndex++) {
      if (verifyPage[byteIndex] != updated[page * 4 + byteIndex]) {
        Serial.println(F("[RFID] Write failed: verification mismatch"));
        return false;
      }
    }
  }

  Serial.print(F("[RFID] Wrote NDEF element ID: "));
  Serial.println(elementId);
  return true;
}
