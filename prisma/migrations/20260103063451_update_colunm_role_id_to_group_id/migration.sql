/*
  Warnings:

  - You are about to drop the column `roleId` on the `roles_registration_types` table. All the data in the column will be lost.
  - Added the required column `groupId` to the `roles_registration_types` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "roles_registration_types" DROP CONSTRAINT "roles_registration_types_roleId_fkey";

-- AlterTable
ALTER TABLE "roles_registration_types" DROP COLUMN "roleId",
ADD COLUMN     "groupId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "roles_registration_types" ADD CONSTRAINT "roles_registration_types_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
