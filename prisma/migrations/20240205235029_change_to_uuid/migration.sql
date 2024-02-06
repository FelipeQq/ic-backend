/*
  Warnings:

  - The primary key for the `BedroomsOnUsers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `EventOnUsers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `TeamOnUsers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `bedrooms` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `events` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `teams` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[cpf]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "BedroomsOnUsers" DROP CONSTRAINT "BedroomsOnUsers_bedroomsId_fkey";

-- DropForeignKey
ALTER TABLE "BedroomsOnUsers" DROP CONSTRAINT "BedroomsOnUsers_userId_fkey";

-- DropForeignKey
ALTER TABLE "EventOnUsers" DROP CONSTRAINT "EventOnUsers_eventId_fkey";

-- DropForeignKey
ALTER TABLE "EventOnUsers" DROP CONSTRAINT "EventOnUsers_userId_fkey";

-- DropForeignKey
ALTER TABLE "TeamOnUsers" DROP CONSTRAINT "TeamOnUsers_teamId_fkey";

-- DropForeignKey
ALTER TABLE "TeamOnUsers" DROP CONSTRAINT "TeamOnUsers_userId_fkey";

-- DropForeignKey
ALTER TABLE "bedrooms" DROP CONSTRAINT "bedrooms_eventId_fkey";

-- DropForeignKey
ALTER TABLE "teams" DROP CONSTRAINT "teams_eventId_fkey";

-- DropIndex
DROP INDEX "users_email_key";

-- AlterTable
ALTER TABLE "BedroomsOnUsers" DROP CONSTRAINT "BedroomsOnUsers_pkey",
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "bedroomsId" SET DATA TYPE TEXT,
ADD CONSTRAINT "BedroomsOnUsers_pkey" PRIMARY KEY ("userId", "bedroomsId");

-- AlterTable
ALTER TABLE "EventOnUsers" DROP CONSTRAINT "EventOnUsers_pkey",
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "eventId" SET DATA TYPE TEXT,
ADD CONSTRAINT "EventOnUsers_pkey" PRIMARY KEY ("userId", "eventId");

-- AlterTable
ALTER TABLE "TeamOnUsers" DROP CONSTRAINT "TeamOnUsers_pkey",
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "teamId" SET DATA TYPE TEXT,
ADD CONSTRAINT "TeamOnUsers_pkey" PRIMARY KEY ("userId", "teamId");

-- AlterTable
ALTER TABLE "bedrooms" DROP CONSTRAINT "bedrooms_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "eventId" SET DATA TYPE TEXT,
ADD CONSTRAINT "bedrooms_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "bedrooms_id_seq";

-- AlterTable
ALTER TABLE "events" DROP CONSTRAINT "events_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "events_id_seq";

-- AlterTable
ALTER TABLE "teams" DROP CONSTRAINT "teams_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "eventId" SET DATA TYPE TEXT,
ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "teams_id_seq";

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "users_id_seq";

-- CreateIndex
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");

-- AddForeignKey
ALTER TABLE "EventOnUsers" ADD CONSTRAINT "EventOnUsers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventOnUsers" ADD CONSTRAINT "EventOnUsers_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bedrooms" ADD CONSTRAINT "bedrooms_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BedroomsOnUsers" ADD CONSTRAINT "BedroomsOnUsers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BedroomsOnUsers" ADD CONSTRAINT "BedroomsOnUsers_bedroomsId_fkey" FOREIGN KEY ("bedroomsId") REFERENCES "bedrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamOnUsers" ADD CONSTRAINT "TeamOnUsers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamOnUsers" ADD CONSTRAINT "TeamOnUsers_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
