#include "HttpPublisher.h"

#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

#include "RootCerts.h"
#include <ArduinoJson.h>

void HttpPublisher::setEndpoint(const String& url) {
  endpoint_ = url;
  endpoint_.trim();
  Serial.print(F("[NET] Endpoint set to: "));
  Serial.println(endpoint_);
}

void HttpPublisher::setDeviceToken(const String& token) {
  deviceToken_ = token;
  deviceToken_.trim();
  Serial.print(F("[NET] Device token "));
  Serial.println(deviceToken_.isEmpty() ? F("not set") : F("set"));
}

bool HttpPublisher::publish(const String& rfidId) {
  if (endpoint_.isEmpty()) {
    Serial.println(F("[NET] No endpoint configured — skip publish"));
    return false;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[NET] WiFi not connected — skip publish"));
    return false;
  }

  JsonDocument doc;
  doc["rfid_id"] = rfidId;
  String body;
  serializeJson(doc, body);

  Serial.print(F("[NET] POST "));
  Serial.print(endpoint_);
  Serial.print(F(" body="));
  Serial.println(body);

  HTTPClient http;
  http.setTimeout(10000);

  // HTTPS for the cloud bridge, verified against the bundled root CAs
  WiFiClientSecure secureClient;
  WiFiClient plainClient;
  bool begun;
  if (endpoint_.startsWith("https://")) {
    secureClient.setCACert(ROOT_CA_BUNDLE);
    begun = http.begin(secureClient, endpoint_);
  } else {
    begun = http.begin(plainClient, endpoint_);
  }
  if (!begun) {
    Serial.println(F("[NET] http.begin failed"));
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  if (!deviceToken_.isEmpty()) {
    http.addHeader("x-device-token", deviceToken_);
  }
  int code = http.POST(body);
  String response = http.getString();
  http.end();

  Serial.print(F("[NET] HTTP "));
  Serial.print(code);
  Serial.print(F(" response="));
  Serial.println(response);

  return code >= 200 && code < 300;
}
