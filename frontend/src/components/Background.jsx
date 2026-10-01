// Interactive animated background.
//  - Three soft colour "blobs" float slowly behind the page.
//  - Each blob takes the colour of one LED and gets brighter when that LED is ON.
//  - A soft spotlight follows the mouse / finger.
import { useEffect } from "react";
import { colorOf } from "./colors.js";

export default function Background({ leds }) {
  // Save the pointer position in CSS variables (--mx, --my) for the spotlight.
  useEffect(() => {
    const move = (e) => {
      document.documentElement.style.setProperty("--mx", `${e.clientX}px`);
      document.documentElement.style.setProperty("--my", `${e.clientY}px`);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);

  return (
    <div className="bg" aria-hidden="true">
      {leds.map((led, i) => (
        <span
          key={led.id}
          className={`blob blob-${i % 3} ${led.desiredState === "ON" ? "lit" : ""}`}
          style={{ "--c": colorOf(led.color) }}
        />
      ))}
      <span className="spotlight" />
      <span className="grain" />
    </div>
  );
}
