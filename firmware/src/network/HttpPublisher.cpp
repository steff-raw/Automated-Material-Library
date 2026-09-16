#include "HttpPublisher.h"

#include <HTTPClient.h>
#include <WiFi.h>
#include <ArduinoJson.h>

void HttpPublisher::setEndpoint(const String& url) {
  endpoint_ = url;
  endpoint_.trim();
  Serial.print(F("[NET] Endpoint set to: "));
  Serial.println(endpoint_);
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
  http.setTimeout(5000);
  if (!http.begin(endpoint_)) {
    Serial.println(F("[NET] http.begin failed"));
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  int code = http.POST(body);
  String response = http.getString();
  http.end();

  Serial.print(F("[NET] HTTP "));
  Serial.print(code);
  Serial.print(F(" response="));
  Serial.println(response);

  return code >= 200 && code < 300;
}
