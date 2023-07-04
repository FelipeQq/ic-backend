/*
  Warnings:

  - Added the required column `workerPrice` to the `events` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "events" ADD COLUMN     "workerPrice" DOUBLE PRECISION NOT NULL;
