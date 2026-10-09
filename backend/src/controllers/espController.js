// =====================================================================
//  ESP CONTROLLER  — used by the ESP32 BOARD (not by the browser)
//
//  The ESP32 is an HTTP *client*. Every 2 seconds it:
//    1. asks  GET  /api/esp/:deviceId/next-commands   "Anything for my LEDs?"
//    2. for each command, switches that LED's pin and replies
//             POST /api/esp/:deviceId/status          "Pin 25 is now ON"
//
//  The ESP32 only knows PIN numbers, so commands are sent with the pin,
//  and status reports identify the LED by its pin.
//
//  Why polling?  The ESP32 can always reach the server, but the server
//  usually can NOT reach the ESP32 (different networks, changing IPs).
// =====================================================================
import prisma from "../prisma.js";

const VALID_STATES = ["ON", "OFF"];

// GET /api/esp/:deviceId/next-commands
// Returns ALL pending commands for this board (oldest first), or an empty list.
export async function getNextCommands(req, res) {
  const { deviceId } = req.params;

  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device) return res.status(404).json({ error: "Device not found" });

  // Every poll proves the ESP32 is alive -> update lastSeenAt.
  await prisma.device.update({ where: { id: deviceId }, data: { lastSeenAt: new Date() } });

  const pending = await prisma.command.findMany({
    where: { status: "PENDING", led: { deviceId } },
    orderBy: { createdAt: "asc" }, // first in, first out
    include: { led: { select: { pin: true } } },
  });

  if (pending.length === 0) return res.json({ commands: [] });

  // Mark them as delivered so they are not sent twice.
  await prisma.command.updateMany({
    where: { id: { in: pending.map((c) => c.id) } },
    data: { status: "DELIVERED", deliveredAt: new Date() },
  });

  // Keep the reply small: the ESP32 only needs id, pin and action.
  res.json({
    commands: pending.map((c) => ({ id: c.id, pin: c.led.pin, action: c.action })),
  });
}
//
// POST /api/esp/:deviceId/status    body: { "pin": 25, "state": "ON", "commandId": 12 }
// The ESP32 reports the REAL state of one LED (after a command, or at boot).
export async function reportStatus(req, res) {
  const { deviceId } = req.params;
  const pin = Number(req.body?.pin);
  const state = String(req.body?.state || "").toUpperCase();
  const commandId = req.body?.commandId ? Number(req.body.commandId) : null;

  if (!VALID_STATES.includes(state)) {
    return res.status(400).json({ error: 'state must be "ON" or "OFF"' });
  }

  // Find the LED by board + pin
  const led = await prisma.led.findUnique({
    where: { deviceId_pin: { deviceId, pin } },
  });
  if (!led) return res.status(404).json({ error: `No LED on pin ${pin} for ${deviceId}` });

  // A report WITHOUT a command (e.g. after a reboot) also resets the desired
  // state — but only if no command is still waiting for this LED.
  let resetDesired = false;
  if (!commandId) {
    const waiting = await prisma.command.count({ where: { ledId: led.id, status: "PENDING" } });
    resetDesired = waiting === 0;
  }

  const now = new Date();
  const writes = [
    // 1. The board is alive
    prisma.device.update({ where: { id: deviceId }, data: { lastSeenAt: now } }),
    // 2. Save the real state of this LED
    prisma.led.update({
      where: { id: led.id },
      data: resetDesired ? { actualState: state, desiredState: state } : { actualState: state },
    }),
    // 3. Keep a history line in StatusLog
    prisma.statusLog.create({
      data: { ledId: led.id, state, commandId, reportedAt: now },
    }),
  ];

  // 4. If this report answers a command, mark that command EXECUTED
  if (commandId) {
    writes.push(
      prisma.command.updateMany({
        where: { id: commandId, ledId: led.id },
        data: { status: "EXECUTED", executedAt: now },
      })
    );
  }

  await prisma.$transaction(writes);
  res.json({ message: "Status saved", led: led.name, state });
}
