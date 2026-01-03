/*
  Warnings:

  - You are about to drop the column `roleRegistrationId` on the `EventOnUsers` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "EventOnUsers" DROP CONSTRAINT "EventOnUsers_roleRegistrationId_fkey";

-- AlterTable
ALTER TABLE "EventOnUsers" DROP COLUMN "roleRegistrationId";

-- CreateTable
CREATE TABLE "EventOnUsersRolesRegistration" (
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "roleRegistrationId" TEXT NOT NULL,

    CONSTRAINT "EventOnUsersRolesRegistration_pkey" PRIMARY KEY ("userId","eventId","roleRegistrationId")
);

-- AddForeignKey
ALTER TABLE "EventOnUsersRolesRegistration" ADD CONSTRAINT "EventOnUsersRolesRegistration_userId_eventId_fkey" FOREIGN KEY ("userId", "eventId") REFERENCES "EventOnUsers"("userId", "eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventOnUsersRolesRegistration" ADD CONSTRAINT "EventOnUsersRolesRegistration_roleRegistrationId_fkey" FOREIGN KEY ("roleRegistrationId") REFERENCES "roles_registration_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
