/*
  Warnings:

  - A unique constraint covering the columns `[registrationNumber]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "registrationNumber" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_registrationNumber_key" ON "users"("registrationNumber");
