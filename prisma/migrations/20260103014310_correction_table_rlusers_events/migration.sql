-- DropForeignKey
ALTER TABLE "EventOnUsers" DROP CONSTRAINT "EventOnUsers_registrationTypeId_fkey";

-- AlterTable
ALTER TABLE "EventOnUsers" ALTER COLUMN "registrationTypeId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "EventOnUsers" ADD CONSTRAINT "EventOnUsers_registrationTypeId_fkey" FOREIGN KEY ("registrationTypeId") REFERENCES "registration_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
