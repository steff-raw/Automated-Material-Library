#include <Arduino.h>
#include <Preferences.h>
#include <WiFiManager.h>

#include "config.h"
#include "sensors/RfidReader.h"
#include "network/HttpPublisher.h"

static RfidReader reader;
static HttpPublisher publisher;
static Preferences prefs;

static String lastUid;
static unsigned long lastScanMs = 0;

static String loadSavedEndpoint() {
  prefs.begin("aml", true);
  String url = prefs.getString("endpoint", WM_PARAM_ENDPOINT_DEFAULT);
  prefs.end();
  return url;
}

static void saveEndpoint(const char* url) {
  prefs.begin("aml", false);
  prefs.putString("endpoint", url);
  prefs.end();
  Serial.print(F("[WIFI] Saved endpoint: "));
  Serial.println(url);
}

static void setupWiFiAndEndpoint() {
  String savedEndpoint = loadSavedEndpoint();

  WiFiManager wm;
  wm.setConfigPortalTimeout(180);

  // Heap-allocated so the save callback can safely reference it
  auto* endpointParam = new WiFiManagerParameter(
      WM_PARAM_ENDPOINT_ID,
      WM_PARAM_ENDPOINT_LABEL,
      savedEndpoint.c_str(),
      WM_PARAM_ENDPOINT_LEN);

  wm.addParameter(endpointParam);
  wm.setSaveParamsCallback([endpointParam]() {
    saveEndpoint(endpointParam->getValue());
  });

  Serial.println(F("[WIFI] Starting WiFiManager (portal SSID: MaterialLibrary-Setup)"));
  bool connected = wm.autoConnect("MaterialLibrary-Setup");

  if (!connected) {
    Serial.println(F("[WIFI] Failed to connect or portal timed out — restarting"));
    delay(2000);
    ESP.restart();
  }

  Serial.print(F("[WIFI] Connected. IP="));
  Serial.println(WiFi.localIP());

  // Persist whatever is in the field (portal save or prior NVS value)
  const char* endpoint = endpointParam->getValue();
  if (endpoint && strlen(endpoint) > 0) {
    saveEndpoint(endpoint);
    publisher.setEndpoint(endpoint);
  } else {
    publisher.setEndpoint(savedEndpoint);
  }
}

void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(500);
  Serial.println();
  Serial.println(F("=== Materials Sample Library — ESP32 RFID ==="));

  setupWiFiAndEndpoint();

  if (!reader.begin()) {
    Serial.println(F("[RFID] Init failed — will keep retrying in loop"));
  }
}

void loop() {
  static unsigned long lastRfidRetryMs = 0;
  // Soft-retry PN532 init if first begin() failed
  if (!reader.isReady() && (millis() - lastRfidRetryMs) > 3000) {
    lastRfidRetryMs = millis();
    reader.begin();
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[WIFI] Disconnected — waiting for reconnect"));
    delay(1000);
    return;
  }

  String uid;
  if (!reader.readUidHex(uid)) {
    delay(20);
    return;
  }

  unsigned long now = millis();
  if (uid == lastUid && (now - lastScanMs) < RFID_DEBOUNCE_MS) {
    Serial.print(F("[RFID] Debounced repeat UID "));
    Serial.println(uid);
    delay(50);
    return;
  }

  lastUid = uid;
  lastScanMs = now;

  Serial.print(F("[RFID] Tag detected: "));
  Serial.println(uid);

  publisher.publish(uid);
  delay(100);
}
