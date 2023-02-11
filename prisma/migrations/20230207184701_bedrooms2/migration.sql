-- DropForeignKey
ALTER TABLE "bedrooms" DROP CONSTRAINT "bedrooms_userId_fkey";

-- AlterTable
ALTER TABLE "bedrooms" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "bedrooms" ADD CONSTRAINT "bedrooms_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
