/*
 * =====================================================================
 *  ESP32 3-LED CONTROLLER  (HTTP polling client)
 *
 *  What this board does, forever:
 *    1. Every 2 seconds:  GET  /api/esp/<DEVICE_ID>/next-commands
 *       Reply example: {"commands":[{"id":7,"pin":26,"action":"ON"}]}
 *    2. For EACH command:
 *         - switch THAT LED's pin only
 *         - POST /api/esp/<DEVICE_ID>/status  {"pin":26,"state":"ON","commandId":7}
 *
 *  Board  : any ESP32 Dev Module
 *  Library: ArduinoJson (by Benoit Blanchon) v7  -> Library Manager
 *  Wiring : each LED -> 220 ohm resistor -> GND
 *             Red    LED  on GPIO 25
 *             Yellow LED  on GPIO 26
 *             Green  LED  on GPIO 27
 *           (The pins MUST match backend/prisma/seed.js)
 * =====================================================================
 */
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// ----------------------- CHANGE THESE --------------------------------
const char* WIFI_SSID     = "...";
const char* WIFI_PASSWORD = "wagwanfam";

// Where the backend runs (no "/" at the end):
//   Local test : your COMPUTER's IP on the same Wi-Fi, e.g. "http://192.168.1.10:5000"
//   Live       : your Render URL, e.g. "https://smart-home-api.onrender.com"
const char* SERVER_URL    = "http://10.116.102.254:5000";

const char* DEVICE_ID     = "esp32-01";          // same id as in the database
const char* DEVICE_KEY    = "esp32-secret-123";  // same as DEVICE_API_KEY in backend/.env
// ---------------------------------------------------------------------

// The three LED pins. Same order and numbers as in seed.js.
const int LED_PINS[] = {25, 26, 27};
const int LED_COUNT  = sizeof(LED_PINS) / sizeof(LED_PINS[0]);
bool ledIsOn[LED_COUNT] = {false, false, false};

// Network clients: plain for http://, secure for https:// (Render).
WiFiClient       plainClient;
WiFiClientSecure secureClient;

// Opens a request with the right client for http or https.
void beginRequest(HTTPClient& http, const String& url) {
  if (url.startsWith("https://")) {
    secureClient.setInsecure();   // classroom shortcut: skip certificate check
    http.begin(secureClient, url);
  } else {
    http.begin(plainClient, url);
  }
  http.setTimeout(15000);         // Render free tier can be slow to wake up
}

const unsigned long POLL_INTERVAL_MS = 2000;
unsigned long lastPoll = 0;

// Find the position (0, 1, 2) of a pin in LED_PINS. Returns -1 if unknown.
int indexOfPin(int pin) {
  for (int i = 0; i < LED_COUNT; i++) {
    if (LED_PINS[i] == pin) return i;
  }
  return -1;
}

// ---------- Hardware: switch ONE LED ----------
void setLed(int index, bool on) {
  ledIsOn[index] = on;
  digitalWrite(LED_PINS[index], on ? HIGH : LOW);
  Serial.printf("[GPIO] LED on pin %d is now %s\n", LED_PINS[index], on ? "ON" : "OFF");
}

// ---------- Wi-Fi ----------
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Connected. ESP32 IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WiFi] Failed. Will retry.");
  }
}

// ---------- ESP32 -> Server: report the real state of ONE LED ----------
void reportStatus(int index, int commandId) {
  HTTPClient http;
  String url = String(SERVER_URL) + "/api/esp/" + DEVICE_ID + "/status";
  beginRequest(http, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", DEVICE_KEY);

  JsonDocument body;
  body["pin"]   = LED_PINS[index];
  body["state"] = ledIsOn[index] ? "ON" : "OFF";
  if (commandId > 0) body["commandId"] = commandId;   // 0 = no command (boot report)

  String json;
  serializeJson(body, json);

  int code = http.POST(json);
  Serial.printf("[HTTP] POST status %s -> %d\n", json.c_str(), code);
  http.end();
}

// ---------- Server -> ESP32: ask for new commands ----------
void pollForCommands() {
  HTTPClient http;
  String url = String(SERVER_URL) + "/api/esp/" + DEVICE_ID + "/next-commands";
  beginRequest(http, url);
  http.addHeader("x-device-key", DEVICE_KEY);

  int code = http.GET();
  if (code != 200) {
    Serial.printf("[HTTP] GET next-commands failed: %d\n", code);
    http.end();
    return;
  }

  String payload = http.getString();
  http.end();

  JsonDocument doc;
  if (deserializeJson(doc, payload)) {
    Serial.println("[JSON] Could not parse reply");
    return;
  }

  // Loop over every command; each one targets ONE LED by its pin.
  for (JsonObject cmd : doc["commands"].as<JsonArray>()) {
    int id             = cmd["id"];
    int pin            = cmd["pin"];
    const char* action = cmd["action"];

    int index = indexOfPin(pin);
    if (index < 0) {
      Serial.printf("[CMD] #%d ignored: pin %d is not one of my LEDs\n", id, pin);
      continue;
    }

    Serial.printf("[CMD] #%d: pin %d -> %s\n", id, pin, action);
    setLed(index, strcmp(action, "ON") == 0);
    reportStatus(index, id);   // confirm: "I did it"
  }
}

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < LED_COUNT; i++) {
    pinMode(LED_PINS[i], OUTPUT);
    setLed(i, false);          // start with all LEDs OFF
  }

  connectWiFi();
  if (WiFi.status() == WL_CONNECTED) {
    for (int i = 0; i < LED_COUNT; i++) reportStatus(i, 0);   // tell the server: all OFF after boot
  }
}

void loop() {
  connectWiFi();   // reconnect if Wi-Fi dropped

  // Non-blocking timer: run every POLL_INTERVAL_MS without using delay()
  if (WiFi.status() == WL_CONNECTED && millis() - lastPoll >= POLL_INTERVAL_MS) {
    lastPoll = millis();
    pollForCommands();
  }
}
