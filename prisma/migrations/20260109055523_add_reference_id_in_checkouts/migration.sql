/*
  Warnings:

  - The values [CREATED,CANCELED] on the enum `CheckoutStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [PENDING] on the enum `PaymentStatus` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `referenceId` to the `payment_checkouts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CheckoutStatus_new" AS ENUM ('ACTIVE', 'EXPIRED', 'INACTIVE');
ALTER TABLE "payment_checkouts" ALTER COLUMN "status" TYPE "CheckoutStatus_new" USING ("status"::text::"CheckoutStatus_new");
ALTER TYPE "CheckoutStatus" RENAME TO "CheckoutStatus_old";
ALTER TYPE "CheckoutStatus_new" RENAME TO "CheckoutStatus";
DROP TYPE "CheckoutStatus_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentStatus_new" AS ENUM ('PAID', 'IN_ANALYSIS', 'DECLINED', 'CANCELED', 'WAITING', 'REFUNDED');
ALTER TABLE "payments" ALTER COLUMN "status" TYPE "PaymentStatus_new" USING ("status"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "PaymentStatus_old";
COMMIT;

-- DropIndex
DROP INDEX "payment_checkouts_checkoutId_key";

-- AlterTable
ALTER TABLE "payment_checkouts" ADD COLUMN     "referenceId" TEXT NOT NULL;
