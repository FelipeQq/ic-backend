/*
  Warnings:

  - You are about to drop the column `img` on the `events` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "events" DROP COLUMN "img",
ADD COLUMN     "data" JSONB;
