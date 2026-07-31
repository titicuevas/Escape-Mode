-- AlterTable
ALTER TABLE "UserPreferences" ADD COLUMN IF NOT EXISTS "browserNotifications" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "UserPreferences" ADD COLUMN IF NOT EXISTS "reminderDaysBefore" INTEGER NOT NULL DEFAULT 7;

-- CreateTable
CREATE TABLE IF NOT EXISTS "GameList" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GameListItem" (
    "id" UUID NOT NULL,
    "listId" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "note" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameListItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GameList_userId_idx" ON "GameList"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "GameList_userId_name_key" ON "GameList"("userId", "name");
CREATE INDEX IF NOT EXISTS "GameListItem_listId_idx" ON "GameListItem"("listId");
CREATE INDEX IF NOT EXISTS "GameListItem_gameId_idx" ON "GameListItem"("gameId");
CREATE UNIQUE INDEX IF NOT EXISTS "GameListItem_listId_gameId_key" ON "GameListItem"("listId", "gameId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "GameList" ADD CONSTRAINT "GameList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "GameListItem" ADD CONSTRAINT "GameListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "GameList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "GameListItem" ADD CONSTRAINT "GameListItem_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
