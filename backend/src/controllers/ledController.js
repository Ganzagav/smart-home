// =====================================================================
//  LED CONTROLLER  — used by the REACT WEB PAGE
//  Each LED has its own button. A click sends:
//      POST /api/leds/:ledId/commands   { "action": "ON" | "OFF" }
// =====================================================================//
import prisma from "../prisma.js";

const VALID_ACTIONS = ["ON", "OFF"];

// POST /api/leds/:ledId/commands
// We do NOT talk to the ESP32 here — we only SAVE the command.
// The ESP32 will pick it up on its next poll (see espController.js).
export async function createCommand(req, res) {
  const ledId = Number(req.params.ledId);
  const action = String(req.body?.action || "").toUpperCase();

  if (!VALID_ACTIONS.includes(action)) {
    return res.status(400).json({ error: 'action must be "ON" or "OFF"' });
  }

  const led = await prisma.led.findUnique({ where: { id: ledId } });
  if (!led) return res.status(404).json({ error: "LED not found" });

  // Two writes that must succeed together -> use a transaction.
  const [command] = await prisma.$transaction([
    prisma.command.create({ data: { ledId, action } }),
    prisma.led.update({ where: { id: ledId }, data: { desiredState: action } }),
  ]);

  res.status(201).json({ message: `${led.name}: ${action} queued`, command });
}

// GET /api/leds/:ledId/status-logs?limit=10  -> recent reports from the ESP32 for one LED
export async function listStatusLogs(req, res) {
  const limit = Math.min(Number(req.query.limit) || 10, 100);
  const logs = await prisma.statusLog.findMany({
    where: { ledId: Number(req.params.ledId) },
    orderBy: { reportedAt: "desc" },
    take: limit,
  });
  res.json(logs);
}
