# Smart Home Automation — Full-Stack IoT Teaching Project

> **Going live?** See [DEPLOY.md](DEPLOY.md) — GitHub, Neon (database), Render (backend) and Vercel (frontend).

A small, complete system that shows students how a **React** web page, a **Node.js/Express** API, a **PostgreSQL** database (through **Prisma ORM**) and an **ESP32** board work together to switch **three real LEDs** ON and OFF. **Each LED has its own button, and each button controls only its own LED.**

```
 ┌──────────────┐  REST (JSON)  ┌──────────────────┐   Prisma   ┌──────────────┐
 │  React UI    │ ────────────▶ │  Node.js/Express │ ─────────▶ │ PostgreSQL   │
 │ 3 LED cards  │ ◀──────────── │   API (:5000)    │ ◀───────── │  database    │
 │ (Vite :5173) │   poll 2 s    └──────────────────┘            └──────────────┘
 └──────────────┘                  ▲            │
                   GET next-commands│            │ {"commands":[{"id":7,"pin":26,"action":"ON"}]}
                   POST status      │            ▼
                                ┌──────────────────────────────┐
                                │ ESP32  Red=25 Yellow=26 Green=27 │  (polls every 2 s over Wi-Fi)
                                └──────────────────────────────┘
```

---

## 1. Folder structure

```
webEspLightController/
├── README.md                     ← this guide
├── DEPLOY.md                     ← put the system online (GitHub, Neon, Render, Vercel)
├── backend/                      ← Node.js + Express + Prisma
│   ├── .env.example              ← copy to .env (DB URL, port, device key)
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma         ← tables: Device, Led, Command, StatusLog
│   │   └── seed.js               ← creates board "esp32-01" + 3 LEDs (pins 25, 26, 27)
│   └── src/
│       ├── server.js             ← starts Express, mounts the routes
│       ├── prisma.js             ← one shared Prisma client
│       ├── routes/
│       │   ├── deviceRoutes.js   ← web page: the board + its LEDs   (/api/devices/...)
│       │   ├── ledRoutes.js      ← web page: ONE LED's button        (/api/leds/...)
│       │   └── espRoutes.js      ← the ESP32 board                   (/api/esp/...)
│       └── controllers/
│           ├── deviceController.js
│           ├── ledController.js
│           └── espController.js
├── frontend/                     ← React + Vite
│   ├── vite.config.js            ← proxy: /api → http://localhost:5000
│   └── src/
│       ├── api.js                ← the ONLY file that calls fetch()
│       ├── App.jsx               ← state + refresh every 2 s
│       └── components/
│           ├── Background.jsx    ← animated background that glows with the LEDs that are ON
│           ├── colors.js         ← colour names ("red") → real colours
│           ├── ControlPanel.jsx  ← draws one LedCard per LED
│           ├── LedCard.jsx       ← bulb + status + its OWN ON/OFF button
│           └── CommandHistory.jsx← table of past commands (all LEDs)
└── esp32/
    └── led_controller/
        └── led_controller.ino    ← Arduino sketch for the ESP32
```

**Rule to teach:** each layer only talks to the layer next to it.
React never touches the database; the ESP32 never touches the database; only the backend does, and only through Prisma.

---

## 2. Database schema (Prisma)

File: `backend/prisma/schema.prisma`

```
Device (ESP32 board) 1 ──< Led 1 ──< Command
                             1 ──< StatusLog >── 0..1 Command
```

| Table | Purpose | Key columns |
|---|---|---|
| **Device** | One row per ESP32 board | `id` ("esp32-01"), `name`, `lastSeenAt` |
| **Led** | One row per LED on the board | `name`, `color`, `pin` (GPIO), `desiredState` (what the user wants), `actualState` (what the ESP32 reports) |
| **Command** | One row per button click | `ledId`, `action` (ON/OFF), `status` (PENDING → DELIVERED → EXECUTED), `createdAt`, `deliveredAt`, `executedAt` |
| **StatusLog** | One row per report from the ESP32 | `ledId`, `state`, `commandId` (which command caused it), `reportedAt` |

`@@unique([deviceId, pin])` on **Led** means two LEDs on the same board cannot use the same pin.

Why two states on each LED?
- `desiredState` changes **immediately** when that LED's button is clicked.
- `actualState` changes **only when the ESP32 confirms**.
If they differ, that LED's card shows “Wait for the system to confirm”. This lets students *see* that a command has not reached the hardware yet.

Every command has three timestamps (clicked, delivered, executed), so students can measure how long each step takes.

---

## 3. API endpoints

### For the React web page

| Method | URL | Body | What it does |
|---|---|---|---|
| GET | `/api/devices` | — | List all boards |
| GET | `/api/devices/:id` | — | One board + its 3 LEDs (+ computed `online`) |
| GET | `/api/devices/:id/commands?limit=15` | — | Recent commands for all LEDs (history table) |
| POST | `/api/leds/:ledId/commands` | `{ "action": "ON" }` | **One LED's button.** Saves a PENDING command for that LED and sets its `desiredState` |
| GET | `/api/leds/:ledId/status-logs?limit=10` | — | Recent ESP32 reports for one LED |

### For the ESP32 — `/api/esp` (header `x-device-key` required)

| Method | URL | Body | What it does |
|---|---|---|---|
| GET | `/api/esp/:deviceId/next-commands` | — | Updates `lastSeenAt`; returns **all** PENDING commands for the board (with the pin of each LED) and marks them DELIVERED |
| POST | `/api/esp/:deviceId/status` | `{ "pin": 26, "state": "ON", "commandId": 7 }` | Saves that LED's `actualState`, adds a StatusLog row, marks the command EXECUTED |

Example replies:

```json
// POST /api/leds/2/commands   {"action":"ON"}
{ "message": "Yellow LED: ON queued",
  "command": { "id": 7, "ledId": 2, "action": "ON", "status": "PENDING", "createdAt": "..." } }

// GET /api/esp/esp32-01/next-commands
{ "commands": [ { "id": 7, "pin": 26, "action": "ON" } ] }     // or { "commands": [] }
```

**Why the pin?** The web page identifies an LED by its database `id`; the ESP32 only knows GPIO pin numbers. The backend translates between the two, so the ESP32 code stays simple.

---

## 4. How the ESP32 communicates — HTTP polling

The ESP32 is an **HTTP client**, not a server. Every 2 seconds it asks the backend “Do you have commands for my LEDs?”. It receives a list; for each command it switches **only that pin** and reports back.

Why this approach for a class:
- It works on any Wi-Fi: the ESP32 can always reach the server, but the server often cannot reach the ESP32 (its IP changes; it may be behind a router).
- It uses the same REST/JSON ideas students already learned for React.
- It needs only the built-in `WiFi.h` and `HTTPClient.h` plus ArduinoJson.

Trade-off to discuss: there is up to a 2-second delay, and the board makes requests even when nothing changes. Later lessons can replace polling with **WebSockets** or **MQTT** (push-based) — the database and React parts stay the same.

At boot the ESP32 turns all LEDs OFF and reports each one (`commandId` omitted). If an LED has no pending command, the backend also resets its `desiredState`, so the page and the hardware agree again after a reboot.

---

## 5. One button click, step by step (Yellow LED)

1. **React** — the user clicks **Turn ON** on the *Yellow LED* card. `LedCard` calls `onCommand("ON")`; `ControlPanel` adds that LED's id; `App.jsx` calls `sendLedCommand(2, "ON")` in `api.js`.
2. **HTTP** — `api.js` sends `POST /api/leds/2/commands` with `{"action":"ON"}`. Vite’s proxy forwards it to port 5000.
3. **Express** — `server.js` → `ledRoutes.js` → `ledController.createCommand()`. The controller checks the action and that LED 2 exists.
4. **Prisma → PostgreSQL** — in one transaction, Prisma inserts a `Command` row (ledId 2, status **PENDING**) and sets `Led 2.desiredState = ON`. Red and Green are not touched.
5. **React** — the page refreshes; the Yellow card shows “Wait for the system to confirm”, and the history shows **PENDING**.
6. **ESP32 polls** — within 2 s it sends `GET /api/esp/esp32-01/next-commands`. `espController.getNextCommands()` updates `lastSeenAt`, finds the PENDING command, marks it **DELIVERED**, and replies `{"commands":[{"id":7,"pin":26,"action":"ON"}]}`.
7. **Hardware** — the sketch finds pin 26 in its `LED_PINS` list and calls `digitalWrite(26, HIGH)`. Only the yellow LED turns on.
8. **ESP32 reports** — it sends `POST /api/esp/esp32-01/status` with `{"pin":26,"state":"ON","commandId":7}`.
9. **Prisma → PostgreSQL** — `espController.reportStatus()` finds the LED by board + pin, sets `actualState = ON`, adds a `StatusLog` row, and marks command 7 **EXECUTED**.
10. **React** — on its next refresh the yellow bulb lights up, its button changes to **Turn OFF**, and the history row shows all three times.

If the user clicks several LED buttons quickly, the ESP32 receives all of them in one poll and handles them one after another.

---

## 6. Setup and run

### Requirements
- Node.js 20 or newer (npm or pnpm)
- PostgreSQL 14 or newer (with pgAdmin or `psql`)
- Arduino IDE 2 with the **ESP32 board package** and the **ArduinoJson** library (v7)
- The computer and the ESP32 on the **same Wi-Fi network**

### Step 1 — Database
Create an empty database named `iot_led_db` (pgAdmin → Databases → Create, or `CREATE DATABASE iot_led_db;`).

### Step 2 — Backend
```bash
cd backend
npm install
cp .env.example .env              # Windows: copy .env.example .env
# edit .env: put your PostgreSQL user/password in DATABASE_URL
npx prisma migrate dev --name init   # Prisma creates the tables
npm run db:seed                   # adds board "esp32-01" with Red, Yellow, Green LEDs
npm run dev                       # API on http://localhost:5000
```
Check: open http://localhost:5000/api/devices/esp32-01 in a browser — you should see 3 LEDs.

> **Already ran the first (1-LED) version?** Reset the database, then create a new migration:
> ```bash
> npx prisma migrate reset --force
> npx prisma migrate dev --name three_leds
> npm run db:seed
> ```
> (`reset` deletes all data — fine for this demo.)

### Step 3 — Frontend
```bash
cd frontend
npm install
npm run dev                       # open http://localhost:5173
```

### Step 4 — Test without hardware (optional, good for class)
Pretend to be the ESP32 with `curl` (or Postman/Thunder Client):
```bash
# 1. click a button in the web page, e.g. Yellow "Turn ON", then:
curl -H "x-device-key: esp32-secret-123" http://localhost:5000/api/esp/esp32-01/next-commands
# 2. confirm it (use the id and pin you received):
curl -X POST -H "x-device-key: esp32-secret-123" -H "Content-Type: application/json" \
     -d "{\"pin\":26,\"state\":\"ON\",\"commandId\":1}" http://localhost:5000/api/esp/esp32-01/status
```
Watch the yellow bulb light up on the page.

### Step 5 — ESP32
1. Find your computer’s IP: `ipconfig` (Windows) → *IPv4 Address*, e.g. `192.168.1.10`.
2. Open `esp32/led_controller/led_controller.ino` and set `WIFI_SSID`, `WIFI_PASSWORD`, `SERVER_URL` (`http://<your-IP>:5000`) and `DEVICE_KEY` (same as `.env`).
3. Wire each LED with a 220 Ω resistor to GND:
   | LED | ESP32 pin |
   |---|---|
   | Red | GPIO 25 |
   | Yellow | GPIO 26 |
   | Green | GPIO 27 |
4. Upload, open Serial Monitor at **115200** baud, then click the buttons.

To use different pins, change them in **both** `seed.js` and `LED_PINS` in the sketch, then run `npm run db:seed` again.

### Useful extra
`npx prisma studio` (inside `backend`) opens Prisma Studio, a web view of the tables — ideal for showing rows appear in real time.

---

## 7. Troubleshooting

| Problem | Likely cause / fix |
|---|---|
| ESP32 prints `GET next-commands failed: -1` | Wrong `SERVER_URL` (do not use `localhost`), different Wi-Fi, or Windows Firewall blocking port 5000 → allow Node.js on *Private networks* |
| ESP32 prints `401` | `DEVICE_KEY` in the sketch ≠ `DEVICE_API_KEY` in `.env` |
| ESP32 prints `404` | `DEVICE_ID` not in the database, or a pin in the sketch is not in `seed.js` → run `npm run db:seed` |
| `[CMD] ... ignored: pin X is not one of my LEDs` | Pins in `seed.js` and `LED_PINS` do not match |
| Page says “Cannot reach the API” | Backend not running, or not on port 5000 |
| `P1001: Can't reach database server` | PostgreSQL not running, or wrong password in `DATABASE_URL` |
| ESP32 shows **Offline** | No poll in the last 10 s — check Serial Monitor |
| One LED never lights | Check its wiring/polarity (long leg = +) and its pin number |

---

## 8. Exercises for students

1. Add a fourth LED: one row in `seed.js`, one pin in `LED_PINS`. No other code changes are needed — why?
2. Add **All ON** / **All OFF** buttons that send one command per LED.
3. Show each LED's `StatusLog` using `GET /api/leds/:ledId/status-logs`.
4. Add a physical push button to the ESP32 that toggles one LED and reports it without a `commandId`.
5. Measure the average time from `createdAt` to `executedAt`. What happens if you change `POLL_INTERVAL_MS` to 500 ms?
6. Add a `BLINK` action: update the enum in `schema.prisma`, run a new migration, then update the controller, React and sketch.
7. Replace polling with WebSockets or MQTT and compare.
