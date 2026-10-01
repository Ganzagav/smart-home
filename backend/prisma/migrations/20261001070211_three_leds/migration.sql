/*
  Warnings:

  - You are about to drop the column `deviceId` on the `Command` table. All the data in the column will be lost.
  - You are about to drop the column `actualState` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `desiredState` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `deviceId` on the `StatusLog` table. All the data in the column will be lost.
  - Added the required column `ledId` to the `Command` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `action` on the `Command` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `ledId` to the `StatusLog` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `state` on the `StatusLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "LedState" AS ENUM ('ON', 'OFF');

-- DropForeignKey
ALTER TABLE "Command" DROP CONSTRAINT "Command_deviceId_fkey";

-- DropForeignKey
ALTER TABLE "StatusLog" DROP CONSTRAINT "StatusLog_deviceId_fkey";

-- DropIndex
DROP INDEX "Command_deviceId_status_idx";

-- DropIndex
DROP INDEX "StatusLog_deviceId_reportedAt_idx";

-- AlterTable
ALTER TABLE "Command" DROP COLUMN "deviceId",
ADD COLUMN     "ledId" INTEGER NOT NULL,
DROP COLUMN "action",
ADD COLUMN     "action" "LedState" NOT NULL;

-- AlterTable
ALTER TABLE "Device" DROP COLUMN "actualState",
DROP COLUMN "desiredState";

-- AlterTable
ALTER TABLE "StatusLog" DROP COLUMN "deviceId",
ADD COLUMN     "ledId" INTEGER NOT NULL,
DROP COLUMN "state",
ADD COLUMN     "state" "LedState" NOT NULL;

-- DropEnum
DROP TYPE "DeviceState";

-- CreateTable
CREATE TABLE "Led" (
    "id" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "pin" INTEGER NOT NULL,
    "desiredState" "LedState" NOT NULL DEFAULT 'OFF',
    "actualState" "LedState" NOT NULL DEFAULT 'OFF',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Led_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Led_deviceId_pin_key" ON "Led"("deviceId", "pin");

-- CreateIndex
CREATE INDEX "Command_ledId_status_idx" ON "Command"("ledId", "status");

-- CreateIndex
CREATE INDEX "StatusLog_ledId_reportedAt_idx" ON "StatusLog"("ledId", "reportedAt");

-- AddForeignKey
ALTER TABLE "Led" ADD CONSTRAINT "Led_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Command" ADD CONSTRAINT "Command_ledId_fkey" FOREIGN KEY ("ledId") REFERENCES "Led"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusLog" ADD CONSTRAINT "StatusLog_ledId_fkey" FOREIGN KEY ("ledId") REFERENCES "Led"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
