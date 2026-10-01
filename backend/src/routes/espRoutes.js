// Routes called by the ESP32 board.
import { Router } from "express";
import { getNextCommands, reportStatus } from "../controllers/espController.js";

const router = Router();

// Very simple protection: the ESP32 must send the secret key in a header.
// (Good enough for a classroom. Real products use per-device tokens + HTTPS.)
router.use((req, res, next) => {
  if (req.get("x-device-key") !== process.env.DEVICE_API_KEY) {
    return res.status(401).json({ error: "Invalid device key" });
  }
  next();
});

router.get("/:deviceId/next-commands", getNextCommands); // GET  /api/esp/esp32-01/next-commands
router.post("/:deviceId/status", reportStatus);          // POST /api/esp/esp32-01/status

export default router;
