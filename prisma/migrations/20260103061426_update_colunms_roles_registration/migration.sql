/*
  Warnings:

  - Added the required column `description` to the `roles_registration_types` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "roles_registration_types" ADD COLUMN     "description" TEXT NOT NULL;
