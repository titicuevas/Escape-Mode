-- AlterEnum
CREATE TYPE "MediaFormat" AS ENUM ('PHYSICAL', 'DIGITAL', 'UNKNOWN');

-- AlterTable
ALTER TABLE "Game" ADD COLUMN "mediaFormat" "MediaFormat" NOT NULL DEFAULT 'UNKNOWN';
