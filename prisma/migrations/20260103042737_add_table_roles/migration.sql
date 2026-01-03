/*
  Warnings:

  - You are about to drop the column `registrationTypeId` on the `EventOnUsers` table. All the data in the column will be lost.
  - You are about to drop the column `registrationTypeId` on the `waitlist` table. All the data in the column will be lost.
  - You are about to drop the `registration_types` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EventOnUsers" DROP CONSTRAINT "EventOnUsers_registrationTypeId_fkey";

-- DropForeignKey
ALTER TABLE "registration_types" DROP CONSTRAINT "registration_types_eventId_fkey";

-- DropForeignKey
ALTER TABLE "waitlist" DROP CONSTRAINT "waitlist_registrationTypeId_fkey";

-- AlterTable
ALTER TABLE "EventOnUsers" DROP COLUMN "registrationTypeId",
ADD COLUMN     "roleRegistrationId" TEXT;

-- AlterTable
ALTER TABLE "waitlist" DROP COLUMN "registrationTypeId",
ADD COLUMN     "roleRegistrationId" TEXT;

-- DropTable
DROP TABLE "registration_types";

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
    "roleId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "roles_registration_types_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EventOnUsers" ADD CONSTRAINT "EventOnUsers_roleRegistrationId_fkey" FOREIGN KEY ("roleRegistrationId") REFERENCES "roles_registration_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_roles" ADD CONSTRAINT "group_roles_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles_registration_types" ADD CONSTRAINT "roles_registration_types_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "group_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_roleRegistrationId_fkey" FOREIGN KEY ("roleRegistrationId") REFERENCES "roles_registration_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
