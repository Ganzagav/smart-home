// Creates one ESP32 board with three LEDs.
// Run with:  npm run db:seed
// The pins here MUST match the pins in the ESP32 sketch.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEVICE_ID = "esp32-01";

const LEDS = [
  { name: "Red LED",    color: "red",    pin: 25 },
  { name: "Yellow LED", color: "yellow", pin: 26 },
  { name: "Green LED",  color: "green",  pin: 27 },
];

async function main() {
  await prisma.device.upsert({
    where: { id: DEVICE_ID },
    update: {},
    create: { id: DEVICE_ID, name: "Classroom ESP32" },
  });

  for (const led of LEDS) {
    await prisma.led.upsert({
      where: { deviceId_pin: { deviceId: DEVICE_ID, pin: led.pin } },
      update: { name: led.name, color: led.color },
      create: { ...led, deviceId: DEVICE_ID },
    });
  }

  const result = await prisma.device.findUnique({
    where: { id: DEVICE_ID },
    include: { leds: true },
  });
  console.log("Seeded:", JSON.stringify(result, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
    
  })
  .finally(() => prisma.$disconnect());
