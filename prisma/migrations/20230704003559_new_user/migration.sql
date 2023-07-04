/*
  Warnings:

  - Added the required column `city` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `diabetes` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hypertensive` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profession` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `state` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `worker` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "city" TEXT NOT NULL,
ADD COLUMN     "diabetes" BOOLEAN NOT NULL,
ADD COLUMN     "emergencyContact" TEXT,
ADD COLUMN     "hypertensive" BOOLEAN NOT NULL,
ADD COLUMN     "indicatedBy" TEXT,
ADD COLUMN     "leadershipPosition" TEXT,
ADD COLUMN     "profession" TEXT NOT NULL,
ADD COLUMN     "profilePhotoUrl" TEXT,
ADD COLUMN     "role" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "state" TEXT NOT NULL,
ADD COLUMN     "worker" BOOLEAN NOT NULL;
