/*
  Warnings:

  - You are about to drop the column `eventUserRoleEventId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `eventUserRoleRoleRegistrationId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `eventUserRoleUserId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `transactionRef` on the `payments` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,eventId,roleRegistrationId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CheckoutStatus" AS ENUM ('CREATED', 'EXPIRED', 'CANCELED');

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_eventUserRoleUserId_eventUserRoleEventId_eventUse_fkey";

-- DropIndex
DROP INDEX "payments_eventUserRoleUserId_eventUserRoleEventId_eventUser_key";

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "eventUserRoleEventId",
DROP COLUMN "eventUserRoleRoleRegistrationId",
DROP COLUMN "eventUserRoleUserId",
DROP COLUMN "transactionRef",
ADD COLUMN     "eventId" TEXT,
ADD COLUMN     "roleRegistrationId" TEXT,
ADD COLUMN     "userId" TEXT;

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

-- CreateIndex
CREATE UNIQUE INDEX "payment_checkouts_checkoutId_key" ON "payment_checkouts"("checkoutId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_userId_eventId_roleRegistrationId_key" ON "payments"("userId", "eventId", "roleRegistrationId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_eventId_roleRegistrationId_fkey" FOREIGN KEY ("userId", "eventId", "roleRegistrationId") REFERENCES "EventOnUsersRolesRegistration"("userId", "eventId", "roleRegistrationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_checkouts" ADD CONSTRAINT "payment_checkouts_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
