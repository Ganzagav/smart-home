// Shows one LedCard per LED. Each card has its OWN button,
// and that button only controls its own LED (it sends its own led.id).
import LedCard from "./LedCard.jsx";

export default function ControlPanel({ leds, sendingLedId, onLedCommand }) {
  return (
    <section className="led-grid">
      {leds.map((led) => (
        <LedCard
          key={led.id}
          led={led}
          busy={sendingLedId === led.id}
          onCommand={(action) => onLedCommand(led.id, action)}
        />
      ))}
    </section>
  );
}
