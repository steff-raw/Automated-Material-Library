# Automated Material Library

RFID-powered materials sample lookup for architecture-firm demos.

**Flow:** ESP32 (PN532) → HTTP POST → FastAPI bridge → Supabase → React UI (Realtime)

```
firmware/     PlatformIO firmware (ESP32 + PN532)
bridge/       FastAPI scan → Supabase upsert
frontend/     Vite + React + Tailwind display
supabase/     Schema, Realtime, seed data
```

---

## Architecture

1. Tag placed on the table → PN532 reads UID
2. ESP32 POSTs `{"rfid_id":"<uid>"}` to the bridge `/scan` endpoint
3. Bridge **adds** that UID to `active_scans` (other samples stay on the table; max 5 shown)
4. Frontend receives a Realtime update, loads matching `materials` rows, and lays them out in a shrinking grid (1 = full screen → 2 side-by-side → 3–5 denser tiles)
5. Remove one sample with `DELETE /scan/{rfid_id}`, or clear the table with `DELETE /scans`

Supabase credentials stay on the bridge and frontend only — never on the ESP32.

---

## PN532 ↔ ESP32 wiring (SPI)

| PN532 pin | ESP32-S3 DevKitC-1 (default) | ESP32 WROOM-32 (`-e esp32dev`) |
|-----------|-----------------------------|--------------------------------|
| SCK       | GPIO 12                     | GPIO 18                        |
| MISO      | GPIO 13                     | GPIO 19                        |
| MOSI      | GPIO 11                     | GPIO 23                        |
| SS (CS)   | GPIO 10                     | GPIO 5                         |
| VCC       | **3V3**                     | **3.3V**                       |
| GND       | GND                         | GND                            |

On the ESP32-S3, GPIO 19/20 are the native USB pins — do not use them. Pins are set per board in `firmware/src/config.h`.

Use the PN532 module in **SPI mode** (typically SEL0/SEL1 jumpers or switches — check your board’s silkscreen). Do not power the module from 5V if it is a 3.3V-only breakout.

---

## Cloud setup (no local server)

- **Bridge** → Supabase Edge Function [`supabase/functions/bridge`](supabase/functions/bridge/index.ts), same routes as `bridge/main.py`
  - URL: `https://<project-ref>.supabase.co/functions/v1/bridge/scan`
  - Deploy with JWT verification **off**; it checks its own auth:
    - ESP32 → `x-device-token` header, matched against `public.bridge_devices` (Table Editor → `bridge_devices` → `token`)
    - Web app → public anon key (Add Material)
  - Service role key stays inside Supabase
- **Frontend** → Vercel, root directory `frontend`, env vars:
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - `VITE_BRIDGE_URL=https://<project-ref>.supabase.co/functions/v1/bridge`
- **ESP32** → setup portal fields:
  - Bridge endpoint URL: the Edge Function `/scan` URL (the firmware default)
  - Device token: from `bridge_devices`
  - Reopen the portal any time: tap **RST**, then hold **BOOT** within 2 s

The local FastAPI bridge below still works for LAN-only setups (leave the device token empty).

---

## 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql)
3. Confirm Realtime is enabled for `active_scans` (the SQL adds it to `supabase_realtime`)
4. Note your project URL, **anon** key, and **service_role** key (Project Settings → API)
5. Update seed `rfid_id` values in `materials` to match your physical tag UIDs (Serial Monitor prints the hex UID on each scan)

---

## 2. Bridge server

```bash
cd bridge
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
uvicorn main:app --host 0.0.0.0 --port 8000
```

- Health: `GET http://<host>:8000/health`
- Place / refresh sample: `POST /scan` with `{"rfid_id":"04A1B2C3"}` (adds without clearing others)
- Remove one: `DELETE /scan/{rfid_id}`
- Clear table: `DELETE /scans`

The ESP32 must reach this host on your LAN (use the machine’s LAN IP, not `localhost`, in the firmware portal).

---

## 3. Frontend

```bash
cd frontend
cp .env.example .env
# Edit .env: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Open the printed local URL (often `http://localhost:5173`). For a kiosk demo, use fullscreen / a large display.

**UI states**

| State | When |
|-------|------|
| Idle | No samples on the table — “Place a sample on the table” |
| Material wall | 1–5 active samples; cards shrink into a denser grid as more are placed |
| Unknown tile | A scanned UID has no matching `materials` row |

Without Supabase credentials the UI opens in **demo mode**: tap samples in the bottom bar to place/remove them (max 5).

---

## 4. ESP32 firmware (PlatformIO)

**Requirements:** [PlatformIO](https://platformio.org/) (VS Code extension or CLI), ESP32-S3 DevKitC-1 (default) or ESP32 WROOM-32 (`pio run -e esp32dev -t upload`), PN532 wired as above. On the dual USB-C S3 board, plug into the **COM** port (not **USB**) for upload and Serial Monitor.

```bash
cd firmware
pio run -t upload
pio device monitor
```

On first boot (or after forgetting WiFi):

1. Join the captive portal AP **`MaterialLibrary-Setup`**
2. Enter WiFi credentials
3. Set **Bridge endpoint URL**, e.g. `http://192.168.1.42:8000/scan`
4. Save / connect — the endpoint is stored in NVS and reused on reboot

**Firmware layout**

| Path | Role |
|------|------|
| `src/sensors/RfidReader.*` | PN532 read → UID hex string |
| `src/network/HttpPublisher.*` | HTTP POST JSON (reusable publish layer) |
| `src/main.cpp` | WiFiManager, debounce (2s), orchestration |
| `src/config.h` | Pins and defaults |

Serial logging at **115200** baud shows WiFi status, UIDs, and HTTP responses.

---

## End-to-end test (without hardware)

```bash
# Terminal 1 — bridge (with .env configured)
cd bridge && uvicorn main:app --host 0.0.0.0 --port 8000

# Terminal 2 — frontend
cd frontend && npm run dev

# Place multiple samples (each adds to the table)
curl -X POST http://localhost:8000/scan -H 'Content-Type: application/json' -d '{"rfid_id":"04A1B2C3"}'
curl -X POST http://localhost:8000/scan -H 'Content-Type: application/json' -d '{"rfid_id":"04D5E6F7"}'
curl -X POST http://localhost:8000/scan -H 'Content-Type: application/json' -d '{"rfid_id":"0489ABCD"}'
```

The browser should grow from one full-screen card into a multi-tile layout as each scan arrives.

---

## Environment files

| File | Variables |
|------|-----------|
| `bridge/.env.example` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `HOST`, `PORT` |
| `frontend/.env.example` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |

Never commit real `.env` files. Never put the service role key in the frontend or firmware.
