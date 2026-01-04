/*
  Warnings:

  - You are about to drop the column `discountId` on the `EventOnUsers` table. All the data in the column will be lost.
  - You are about to drop the column `eventId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `payments` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[eventUserRoleUserId,eventUserRoleEventId,eventUserRoleRoleRegistrationId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "EventOnUsers" DROP CONSTRAINT "EventOnUsers_discountId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_userId_eventId_fkey";

-- DropIndex
DROP INDEX "payments_userId_eventId_key";

-- AlterTable
ALTER TABLE "EventOnUsers" DROP COLUMN "discountId";

-- AlterTable
ALTER TABLE "EventOnUsersRolesRegistration" ADD COLUMN     "discountId" TEXT;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "eventId",
DROP COLUMN "userId",
ADD COLUMN     "eventUserRoleEventId" TEXT,
ADD COLUMN     "eventUserRoleRoleRegistrationId" TEXT,
ADD COLUMN     "eventUserRoleUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payments_eventUserRoleUserId_eventUserRoleEventId_eventUser_key" ON "payments"("eventUserRoleUserId", "eventUserRoleEventId", "eventUserRoleRoleRegistrationId");

-- AddForeignKey
ALTER TABLE "EventOnUsersRolesRegistration" ADD CONSTRAINT "EventOnUsersRolesRegistration_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_eventUserRoleUserId_eventUserRoleEventId_eventUse_fkey" FOREIGN KEY ("eventUserRoleUserId", "eventUserRoleEventId", "eventUserRoleRoleRegistrationId") REFERENCES "EventOnUsersRolesRegistration"("userId", "eventId", "roleRegistrationId") ON DELETE CASCADE ON UPDATE CASCADE;
