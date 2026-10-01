// =====================================================================
//  DEVICE CONTROLLER  — used by the REACT WEB PAGE
//  A "device" is the ESP32 board. It owns three LEDs.
//  Flow:  React UI  ->  Express route  ->  this controller  ->  Prisma  ->  PostgreSQL
// =====================================================================
import prisma from "../prisma.js";

const ONLINE_TIMEOUT_MS = 10_000; // ESP32 is "online" if it talked to us in the last 10 s

// Adds a computed "online" field to a device row.
function withOnlineFlag(device) {
  const online =
    device.lastSeenAt !== null &&
    Date.now() - new Date(device.lastSeenAt).getTime() < ONLINE_TIMEOUT_MS;
  return { ...device, online };
}

// GET /api/devices  -> list all boards
export async function listDevices(req, res) {
  const devices = await prisma.device.findMany({ orderBy: { createdAt: "asc" } });
  res.json(devices.map(withOnlineFlag));
}

// GET /api/devices/:id  -> one board + its LEDs (the main data for the web page)
export async function getDevice(req, res) {
  const device = await prisma.device.findUnique({
    where: { id: req.params.id },
    include: { leds: { orderBy: { pin: "asc" } } },
  });
  if (!device) return res.status(404).json({ error: "Device not found" });
  res.json(withOnlineFlag(device));
}

// GET /api/devices/:id/commands?limit=15  -> recent commands for ALL LEDs of this board
export async function listCommands(req, res) {
  const limit = Math.min(Number(req.query.limit) || 15, 100);
  const commands = await prisma.command.findMany({
    where: { led: { deviceId: req.params.id } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { led: { select: { name: true, color: true, pin: true } } },
  });
  res.json(commands);
}
