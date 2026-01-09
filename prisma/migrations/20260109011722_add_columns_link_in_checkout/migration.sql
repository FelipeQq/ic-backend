/*
  Warnings:

  - Added the required column `link` to the `payment_checkouts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payment_checkouts" ADD COLUMN     "link" TEXT NOT NULL;
