// Routes called by the React web page — about the ESP32 BOARD.
//
import { Router } from "express";
import { listDevices, getDevice, listCommands } from "../controllers/deviceController.js";

const router = Router();

router.get("/", listDevices);                 // GET /api/devices
router.get("/:id", getDevice);                // GET /api/devices/esp32-01          (board + 3 LEDs)
router.get("/:id/commands", listCommands);    // GET /api/devices/esp32-01/commands (history)

export default router;
