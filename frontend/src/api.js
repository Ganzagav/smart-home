// =====================================================================
//  API LAYER — the ONLY file in React that talks to the backend.
//  Components call these functions; they never use fetch() directly.
// =====================================================================
//
// In development VITE_API_URL is empty, so "/api/..." goes through the Vite proxy.
// In production (Vercel) it is the Render URL, e.g. https://smart-home-api.onrender.com
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function request(url, options) {
  const res = await fetch(API_URL + url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// GET /api/devices/:id  -> { name, online, lastSeenAt, leds: [ {id, name, color, pin, desiredState, actualState}, ... ] }
export function getDevice(deviceId) {
  return request(`/api/devices/${deviceId}`);
}

// GET /api/devices/:id/commands?limit=50  -> history for all LEDs (table shows 5 at a time)
export function getCommands(deviceId, limit = 15) {
  return request(`/api/devices/${deviceId}/commands?limit=${limit}`);
}

// POST /api/leds/:ledId/commands  with body { action: "ON" | "OFF" }
// Each LED button calls this with ITS OWN ledId.
export function sendLedCommand(ledId, action) {
  return request(`/api/leds/${ledId}/commands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
}
