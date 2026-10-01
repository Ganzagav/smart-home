// Shows the ESP32 BOARD status: online/offline and last contact.
export default function StatusCard({ device }) {
  const ledsOn = device.leds.filter((l) => l.actualState === "ON").length;

  return (
    <section className="card">
      <h2>{device.name}</h2>
      <ul className="details">
        <li>
          ESP32:{" "}
          <span className={device.online ? "badge online" : "badge offline"}>
            {device.online ? "Online" : "Offline"}
          </span>
        </li>
        <li>
          Last seen:{" "}
          {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleTimeString() : "never"}
        </li>
        <li>
          LEDs ON: {ledsOn} / {device.leds.length}
        </li>
      </ul>
    </section>
  );
}
