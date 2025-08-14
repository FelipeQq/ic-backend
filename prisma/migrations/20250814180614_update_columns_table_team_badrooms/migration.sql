-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('MEMBER', 'LEADER');

-- AlterTable
ALTER TABLE "TeamOnUsers" ADD COLUMN     "role" "TeamRole" NOT NULL DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "bedrooms" ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'Quarto sem nome',
ADD COLUMN     "tag" TEXT[];

-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "note" TEXT;
