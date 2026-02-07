/*
  Warnings:

  - A unique constraint covering the columns `[userId,eventId,roleRegistrationId]` on the table `waitlist` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "waitlist_userId_eventId_key";

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_userId_eventId_roleRegistrationId_key" ON "waitlist"("userId", "eventId", "roleRegistrationId");
