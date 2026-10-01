// One LED: a glowing bulb, its real status, and ONE button that toggles it.
//  The button shows the CURRENT state of the LED:
//  - LED ON  -> button says "ON"  (coloured), bulb is lit.   Click -> sends "OFF"
//  - LED OFF -> button says "OFF" (dark),     bulb is grey.  Click -> sends "ON"
//
// The card shows the state the USER chose (desiredState) right away:
//   ON  -> bulb lit with glow and light rays
//   OFF -> grey bulb
// Until the ESP32 confirms, a small "Wait for the system to confirm" message is shown.
import { colorOf } from "./colors.js";

// Light rays around the bulb (angles in degrees, 0 = right, -90 = up)
const RAY_ANGLES = [-180, -150, -120, -90, -60, -30, 0];
const CX = 32, CY = 26;              // centre of the bulb glass
const rays = RAY_ANGLES.map((deg) => {
  const a = (deg * Math.PI) / 180;
  return {
    x1: CX + Math.cos(a) * 27, y1: CY + Math.sin(a) * 27,
    x2: CX + Math.cos(a) * 35, y2: CY + Math.sin(a) * 35,
  };
});

export default function LedCard({ led, busy, onCommand }) {
  const isOn = led.desiredState === "ON";           // what the user switched it to
  const waiting = led.desiredState !== led.actualState; // ESP32 has not confirmed yet
  const nextAction = isOn ? "OFF" : "ON";
  const look = isOn ? "is-on" : "is-off";

  return (
    <article className={`led-card ${look}`} style={{ "--led": colorOf(led.color) }}>
      <div className="led-top">
        <h2>{led.name}</h2>
        <span className={`chip ${isOn ? "chip-on" : "chip-off"}`}>{isOn ? "ON" : "OFF"}</span>
      </div>

      {/* Light bulb icon */}
      <div className="bulb-wrap">
        <svg className="bulb" viewBox="-8 -14 80 80" aria-hidden="true">
          <circle className="bulb-halo" cx={CX} cy={CY} r="30" />

          <g className="bulb-rays">
            {rays.map((r, i) => (
              <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} />
            ))}
          </g>

          <path
            className="bulb-glass"
            d="M32 6c-11 0-19 8.4-19 19 0 7.3 4 12.2 7.4 15.6 1.9 1.9 3.1 4.3 3.1 7V50h17v-2.4c0-2.7 1.2-5.1 3.1-7C47 37.2 51 32.3 51 25 51 14.4 43 6 32 6Z"
          />
          {/* small white shine on the glass */}
          <path className="bulb-shine" d="M22 20c1.5-5 5-8 9-9" />
          <path className="bulb-base" d="M24 53h16v3a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4v-3Z" />
          <path className="bulb-filament" d="M26 33l3 4 3-4 3 4 3-4" />
        </svg>
      </div>

      <button
        className={`toggle ${isOn ? "toggle-on" : "toggle-off"}`}
        aria-pressed={isOn}
        title={`Click to turn ${nextAction}`}
        disabled={busy}
        onClick={() => onCommand(nextAction)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
             strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M12 3v9" />
          <path d="M6.3 7.3a8 8 0 1 0 11.4 0" />
        </svg>
        {isOn ? "ON" : "OFF"}
      </button>

      <p className={`hint ${waiting ? "show" : ""}`}>
        <span className="spinner" aria-hidden="true" /> Wait for the system to confirm
      </p>
    </article>
  );
}
