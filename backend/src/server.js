// =====================================================================
//  SERVER ENTRY POINT
//  Starts Express, plugs in middleware and the groups of routes:
//    /api/devices  -> web page: the ESP32 board and its LEDs
//    /api/leds     -> web page: one LED (its own ON/OFF button)
//    /api/esp      -> the ESP32 board itself
// =====================================================================
import "dotenv/config";
import express from "express";
import cors from "cors";
import deviceRoutes from "./routes/deviceRoutes.js";
import ledRoutes from "./routes/ledRoutes.js";
import espRoutes from "./routes/espRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());          // allow the React dev server (another port) to call us
app.use(express.json());  // turn JSON request bodies into req.body

// Log every request so students can SEE the traffic in the terminal.
app.use((req, res, next) => {
  console.log(`${new Date().toLocaleTimeString()}  ${req.method} ${req.originalUrl}`);
  next();
});

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/devices", deviceRoutes);
app.use("/api/leds", ledRoutes);
app.use("/api/esp", espRoutes);

// Unknown route
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// Any error thrown in a controller ends up here (Express 5 catches async errors).
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Server error", detail: err.message });
});

// "0.0.0.0" = listen on ALL network cards, so the ESP32 on the same Wi-Fi can reach us.
app.listen(PORT, "0.0.0.0", () => {
  console.log(`API running on http://localhost:${PORT}`);
  console.log("ESP32 must use this computer's LAN IP, e.g. http://192.168.1.10:" + PORT);
});
