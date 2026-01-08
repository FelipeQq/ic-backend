/*
  Warnings:

  - You are about to drop the column `paid` on the `EventOnUsers` table. All the data in the column will be lost.
  - You are about to drop the column `worker` on the `EventOnUsers` table. All the data in the column will be lost.
  - You are about to drop the column `capacity` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `capacityWorker` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `img` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `workerPrice` on the `events` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('CURSILHO', 'RETIRO');

-- CreateEnum
CREATE TYPE "PaymentReceived" AS ENUM ('SYSTEM', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'BOLETO', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'CANCELED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CheckoutStatus" AS ENUM ('CREATED', 'EXPIRED', 'CANCELED', 'INACTIVE');

-- AlterTable
ALTER TABLE "EventOnUsers" DROP COLUMN "paid",
DROP COLUMN "worker";

-- AlterTable
ALTER TABLE "events" DROP COLUMN "capacity",
DROP COLUMN "capacityWorker",
DROP COLUMN "img",
DROP COLUMN "price",
DROP COLUMN "workerPrice",
ADD COLUMN     "data" JSONB,
ADD COLUMN     "type" "EventType" NOT NULL DEFAULT 'CURSILHO';

-- CreateTable
CREATE TABLE "EventOnUsersRolesRegistration" (
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "roleRegistrationId" TEXT NOT NULL,
    "discountId" TEXT,

    CONSTRAINT "EventOnUsersRolesRegistration_pkey" PRIMARY KEY ("userId","eventId","roleRegistrationId")
);

-- CreateTable
CREATE TABLE "group_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "group_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles_registration_types" (
    "id" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "roles_registration_types_pkey" PRIMARY KEY ("id")
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
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "receivedFrom" "PaymentReceived" NOT NULL DEFAULT 'SYSTEM',
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT,
    "roleRegistrationId" TEXT,
    "userId" TEXT,
    "payload" JSONB,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_checkouts" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "checkoutId" TEXT NOT NULL,
    "status" "CheckoutStatus" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_checkouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roleRegistrationId" TEXT,

    CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_userId_eventId_roleRegistrationId_key" ON "payments"("userId", "eventId", "roleRegistrationId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_checkouts_checkoutId_key" ON "payment_checkouts"("checkoutId");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_userId_eventId_key" ON "waitlist"("userId", "eventId");

-- AddForeignKey
ALTER TABLE "EventOnUsersRolesRegistration" ADD CONSTRAINT "EventOnUsersRolesRegistration_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventOnUsersRolesRegistration" ADD CONSTRAINT "EventOnUsersRolesRegistration_roleRegistrationId_fkey" FOREIGN KEY ("roleRegistrationId") REFERENCES "roles_registration_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventOnUsersRolesRegistration" ADD CONSTRAINT "EventOnUsersRolesRegistration_userId_eventId_fkey" FOREIGN KEY ("userId", "eventId") REFERENCES "EventOnUsers"("userId", "eventId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_roles" ADD CONSTRAINT "group_roles_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles_registration_types" ADD CONSTRAINT "roles_registration_types_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_eventId_roleRegistrationId_fkey" FOREIGN KEY ("userId", "eventId", "roleRegistrationId") REFERENCES "EventOnUsersRolesRegistration"("userId", "eventId", "roleRegistrationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_checkouts" ADD CONSTRAINT "payment_checkouts_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_roleRegistrationId_fkey" FOREIGN KEY ("roleRegistrationId") REFERENCES "roles_registration_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
