-- CreateEnum
CREATE TYPE "DeviceState" AS ENUM ('ON', 'OFF');

-- CreateEnum
CREATE TYPE "CommandStatus" AS ENUM ('PENDING', 'DELIVERED', 'EXECUTED');

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "desiredState" "DeviceState" NOT NULL DEFAULT 'OFF',
    "actualState" "DeviceState" NOT NULL DEFAULT 'OFF',
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Command" (
    "id" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "action" "DeviceState" NOT NULL,
    "status" "CommandStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),

    CONSTRAINT "Command_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusLog" (
    "id" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "state" "DeviceState" NOT NULL,
    "commandId" INTEGER,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Command_deviceId_status_idx" ON "Command"("deviceId", "status");

-- CreateIndex
CREATE INDEX "StatusLog_deviceId_reportedAt_idx" ON "StatusLog"("deviceId", "reportedAt");

-- AddForeignKey
ALTER TABLE "Command" ADD CONSTRAINT "Command_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusLog" ADD CONSTRAINT "StatusLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusLog" ADD CONSTRAINT "StatusLog_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "Command"("id") ON DELETE SET NULL ON UPDATE CASCADE;
