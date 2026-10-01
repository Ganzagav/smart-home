// =====================================================================
//  APP — holds the state and refreshes it from the API every 2 seconds.
// =====================================================================
import { useEffect, useState, useCallback } from "react";
import { getDevice, getCommands, sendLedCommand } from "./api.js";
import Background from "./components/Background.jsx";
import ControlPanel from "./components/ControlPanel.jsx";
import CommandHistory from "./components/CommandHistory.jsx";

const DEVICE_ID = "esp32-01"; // must match the id in the database AND in the ESP32 sketch
const REFRESH_MS = 2000;

export default function App() {
  const [device, setDevice] = useState(null);
  const [commands, setCommands] = useState([]);
  const [error, setError] = useState("");
  const [sendingLedId, setSendingLedId] = useState(null); // which LED button is busy

  // Read the latest data from the backend.
  const refresh = useCallback(async () => {
    try {
      const [d, c] = await Promise.all([getDevice(DEVICE_ID), getCommands(DEVICE_ID, 50)]);
      setDevice(d);
      setCommands(c);
      setError("");
    } catch (err) {
      setError("Cannot reach the API: " + err.message);
    }
  }, []);

  // Load once, then poll every 2 s so the page shows what the ESP32 reports.
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  // Called when ONE LED's button is clicked.
  async function handleLedCommand(ledId, action) {
    setSendingLedId(ledId);
    try {
      await sendLedCommand(ledId, action);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingLedId(null);
    }
  }

  return (
    <>
      {/* Animated background: it glows with the colour of every LED that is ON */}
      <Background leds={device?.leds ?? []} />

      <main className="container">
        <header className="header">
          <div className="logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
            </svg>
          </div>
          <div>
            <h1>Smart Home Automation</h1>
            <p className="subtitle">Control your lights from one place.</p>
          </div>
        </header>

        {error && <div className="error">{error}</div>}

        {device ? (
          <>
            <ControlPanel
              leds={device.leds}
              sendingLedId={sendingLedId}
              onLedCommand={handleLedCommand}
            />
            <CommandHistory commands={commands} />
          </>
        ) : (
          !error && <p className="loading">Loading…</p>
        )}
      </main>
    </>
  );
}
