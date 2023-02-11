/*
  Warnings:

  - You are about to drop the column `userId` on the `bedrooms` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "bedrooms" DROP CONSTRAINT "bedrooms_userId_fkey";

-- AlterTable
ALTER TABLE "bedrooms" DROP COLUMN "userId";

-- CreateTable
CREATE TABLE "BedroomsOnUsers" (
    "userId" INTEGER NOT NULL,
    "bedroomsId" INTEGER NOT NULL,

    CONSTRAINT "BedroomsOnUsers_pkey" PRIMARY KEY ("userId","bedroomsId")
);

-- AddForeignKey
ALTER TABLE "BedroomsOnUsers" ADD CONSTRAINT "BedroomsOnUsers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BedroomsOnUsers" ADD CONSTRAINT "BedroomsOnUsers_bedroomsId_fkey" FOREIGN KEY ("bedroomsId") REFERENCES "bedrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
