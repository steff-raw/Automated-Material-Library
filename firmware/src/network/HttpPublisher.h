#pragma once

#include <Arduino.h>

/**
 * Network publish layer: HTTP POST JSON {"rfid_id": "<id>"}.
 * Reusable with any sensor that produces a string identifier.
 */
class HttpPublisher {
 public:
  void setEndpoint(const String& url);
  const String& endpoint() const { return endpoint_; }

  /** POST JSON body. Returns true on HTTP 2xx. */
  bool publish(const String& rfidId);

 private:
  String endpoint_;
};
