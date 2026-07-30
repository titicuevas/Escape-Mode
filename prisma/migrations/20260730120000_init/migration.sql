-- CreateEnum
CREATE TYPE "InterestStatus" AS ENUM ('INTERESTED', 'THINKING', 'NOT_INTERESTED', 'MUST_BUY');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('UNRESERVED', 'WAITING_OFFER', 'RESERVED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'RECEIVED', 'PLAYING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('AVAILABLE', 'PREORDER', 'OUT_OF_STOCK', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('RESERVATION', 'PAYMENT', 'REFUND');

-- CreateEnum
CREATE TYPE "DiscoveryDecisionType" AS ENUM ('LIKED', 'THINKING', 'DISMISSED', 'MUST_BUY');

-- CreateEnum
CREATE TYPE "PlatformFamily" AS ENUM ('PLAYSTATION_5', 'XBOX_SERIES', 'NINTENDO_SWITCH', 'NINTENDO_SWITCH_2', 'PC', 'OTHER');

-- CreateEnum
CREATE TYPE "DateSource" AS ENUM ('RAWG', 'MANUAL', 'OFFICIAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CalendarView" AS ENUM ('MONTHLY', 'TIMELINE');

-- CreateEnum
CREATE TYPE "BudgetGrouping" AS ENUM ('RELEASE', 'RESERVATION', 'PAYMENT');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "preferredPlatforms" "PlatformFamily"[] DEFAULT ARRAY[]::"PlatformFamily"[],
    "defaultDiscoveryMonths" INTEGER NOT NULL DEFAULT 12,
    "defaultCalendarView" "CalendarView" NOT NULL DEFAULT 'MONTHLY',
    "defaultBudgetGrouping" "BudgetGrouping" NOT NULL DEFAULT 'RELEASE',
    "hideDismissedGames" BOOLEAN NOT NULL DEFAULT true,
    "reduceMotion" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "rawgId" INTEGER,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "coverUrl" TEXT,
    "backgroundUrl" TEXT,
    "description" TEXT,
    "releaseDate" DATE,
    "earlyAccessDate" DATE,
    "dateSource" "DateSource" NOT NULL DEFAULT 'UNKNOWN',
    "officialUrl" TEXT,
    "rawgUrl" TEXT,
    "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "normalizedPlatforms" "PlatformFamily"[] DEFAULT ARRAY[]::"PlatformFamily"[],
    "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "developer" TEXT,
    "publisher" TEXT,
    "esrbRating" TEXT,
    "metacritic" INTEGER,
    "interestStatus" "InterestStatus" NOT NULL DEFAULT 'THINKING',
    "purchaseStatus" "PurchaseStatus" NOT NULL DEFAULT 'UNRESERVED',
    "selectedPlatform" TEXT,
    "selectedEdition" TEXT,
    "selectedStore" TEXT,
    "totalPrice" DECIMAL(10,2),
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "targetPrice" DECIMAL(10,2),
    "reservationDate" DATE,
    "paymentDeadline" DATE,
    "orderNumber" TEXT,
    "purchaseUrl" TEXT,
    "includesBonus" BOOLEAN NOT NULL DEFAULT false,
    "bonusDescription" TEXT,
    "useEarlyAccessAsMainDate" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreOffer" (
    "id" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "store" TEXT NOT NULL,
    "edition" TEXT,
    "platform" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "shippingCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "url" TEXT,
    "availability" "Availability" NOT NULL DEFAULT 'UNKNOWN',
    "includesBonus" BOOLEAN NOT NULL DEFAULT false,
    "bonusDescription" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentHistory" (
    "id" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentDate" DATE NOT NULL,
    "paymentType" "PaymentType" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryDecision" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "rawgId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "coverUrl" TEXT,
    "backgroundUrl" TEXT,
    "releaseDate" DATE,
    "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "decision" "DiscoveryDecisionType" NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscoveryDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");

-- CreateIndex
CREATE INDEX "Game_userId_idx" ON "Game"("userId");

-- CreateIndex
CREATE INDEX "Game_releaseDate_idx" ON "Game"("releaseDate");

-- CreateIndex
CREATE INDEX "Game_earlyAccessDate_idx" ON "Game"("earlyAccessDate");

-- CreateIndex
CREATE INDEX "Game_interestStatus_idx" ON "Game"("interestStatus");

-- CreateIndex
CREATE INDEX "Game_purchaseStatus_idx" ON "Game"("purchaseStatus");

-- CreateIndex
CREATE INDEX "Game_selectedPlatform_idx" ON "Game"("selectedPlatform");

-- CreateIndex
CREATE UNIQUE INDEX "Game_userId_rawgId_key" ON "Game"("userId", "rawgId");

-- CreateIndex
CREATE INDEX "StoreOffer_gameId_idx" ON "StoreOffer"("gameId");

-- CreateIndex
CREATE INDEX "PaymentHistory_gameId_idx" ON "PaymentHistory"("gameId");

-- CreateIndex
CREATE INDEX "PaymentHistory_paymentDate_idx" ON "PaymentHistory"("paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "DiscoveryDecision_userId_idx" ON "DiscoveryDecision"("userId");

-- CreateIndex
CREATE INDEX "DiscoveryDecision_decision_idx" ON "DiscoveryDecision"("decision");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveryDecision_userId_rawgId_key" ON "DiscoveryDecision"("userId", "rawgId");

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreOffer" ADD CONSTRAINT "StoreOffer_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentHistory" ADD CONSTRAINT "PaymentHistory_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryDecision" ADD CONSTRAINT "DiscoveryDecision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
