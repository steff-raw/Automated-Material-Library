#pragma once

// PN532 SPI ↔ ESP32 WROOM-32 pin mapping
#define PN532_SCK   18
#define PN532_MISO  19
#define PN532_MOSI  23
#define PN532_SS    5

// WiFiManager custom parameter for the bridge POST URL
#define WM_PARAM_ENDPOINT_ID   "endpoint_url"
#define WM_PARAM_ENDPOINT_LABEL "Bridge endpoint URL"
#define WM_PARAM_ENDPOINT_LEN  128
#define WM_PARAM_ENDPOINT_DEFAULT "http://192.168.1.100:8000/scan"

// Debounce: ignore the same UID within this window (ms)
#define RFID_DEBOUNCE_MS 2000

#define SERIAL_BAUD 115200
