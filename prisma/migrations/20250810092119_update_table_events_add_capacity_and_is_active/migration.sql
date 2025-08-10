-- AlterTable
ALTER TABLE "events" ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false;
