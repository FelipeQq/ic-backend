-- DropForeignKey
ALTER TABLE "EventOnUsersRolesRegistration" DROP CONSTRAINT "EventOnUsersRolesRegistration_userId_eventId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_userId_eventId_fkey";

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "eventId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "EventOnUsersRolesRegistration" ADD CONSTRAINT "EventOnUsersRolesRegistration_userId_eventId_fkey" FOREIGN KEY ("userId", "eventId") REFERENCES "EventOnUsers"("userId", "eventId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_eventId_fkey" FOREIGN KEY ("userId", "eventId") REFERENCES "EventOnUsers"("userId", "eventId") ON DELETE SET NULL ON UPDATE CASCADE;
