// Routes called by the React web page — about ONE LED.
import { Router } from "express";
import { createCommand, listStatusLogs } from "../controllers/ledController.js";

const router = Router();

router.post("/:ledId/commands", createCommand);     // POST /api/leds/1/commands   { action: "ON" }
router.get("/:ledId/status-logs", listStatusLogs);  // GET  /api/leds/1/status-logs

export default router;
