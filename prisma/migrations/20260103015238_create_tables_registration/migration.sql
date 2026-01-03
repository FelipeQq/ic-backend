/*
  Warnings:

  - You are about to drop the column `paid` on the `EventOnUsers` table. All the data in the column will be lost.
  - You are about to drop the column `worker` on the `EventOnUsers` table. All the data in the column will be lost.
  - You are about to drop the column `capacity` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `capacityWorker` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `workerPrice` on the `events` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('CURSILHO', 'RETIRO');

-- CreateEnum
CREATE TYPE "PaymentReceived" AS ENUM ('SYSTEM', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'CANCELED', 'REFUNDED');

-- AlterTable
ALTER TABLE "EventOnUsers" DROP COLUMN "paid",
DROP COLUMN "worker",
ADD COLUMN     "discountId" TEXT,
ADD COLUMN     "registrationTypeId" TEXT;

-- AlterTable
ALTER TABLE "events" DROP COLUMN "capacity",
DROP COLUMN "capacityWorker",
DROP COLUMN "price",
DROP COLUMN "workerPrice",
ADD COLUMN     "type" "EventType" NOT NULL DEFAULT 'CURSILHO';

-- CreateTable
CREATE TABLE "registration_types" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "capacity" INTEGER NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discounts" (
    "id" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "receivedFrom" "PaymentReceived" NOT NULL DEFAULT 'SYSTEM',
    "amount" DOUBLE PRECISION NOT NULL,
    "transactionRef" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "registrationTypeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_userId_eventId_key" ON "payments"("userId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_userId_eventId_key" ON "waitlist"("userId", "eventId");

-- AddForeignKey
ALTER TABLE "EventOnUsers" ADD CONSTRAINT "EventOnUsers_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventOnUsers" ADD CONSTRAINT "EventOnUsers_registrationTypeId_fkey" FOREIGN KEY ("registrationTypeId") REFERENCES "registration_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_types" ADD CONSTRAINT "registration_types_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_eventId_fkey" FOREIGN KEY ("userId", "eventId") REFERENCES "EventOnUsers"("userId", "eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_registrationTypeId_fkey" FOREIGN KEY ("registrationTypeId") REFERENCES "registration_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
