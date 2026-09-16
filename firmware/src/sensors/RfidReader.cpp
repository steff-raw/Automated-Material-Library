#include "RfidReader.h"

#include <SPI.h>
#include <Adafruit_PN532.h>

#include "config.h"

static Adafruit_PN532 nfc(PN532_SCK, PN532_MISO, PN532_MOSI, PN532_SS);

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
