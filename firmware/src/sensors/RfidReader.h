#pragma once

#include <Arduino.h>

/**
 * Sensor layer: PN532 over SPI.
 * Isolated from networking so other sensors can swap in later.
 */
class RfidReader {
 public:
  bool begin();
  bool isReady() const { return ready_; }
  /**
   * Non-blocking poll. Returns true when a tag UID was read into outUidHex.
   * outUidHex is uppercase hex without separators (e.g. "04A1B2C3").
   */
  bool readUidHex(String& outUidHex);

 private:
  bool ready_ = false;
};
