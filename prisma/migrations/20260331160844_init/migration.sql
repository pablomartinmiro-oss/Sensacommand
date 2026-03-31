-- CreateEnum
CREATE TYPE "PlayerSource" AS ENUM ('WALK_IN', 'REFERRAL', 'SOCIAL_MEDIA', 'WEBSITE', 'PLAYBYPOINT', 'OTHER');

-- CreateEnum
CREATE TYPE "PlayerStatus" AS ENUM ('NEW', 'ACTIVE', 'HOT_LEAD', 'COLD_LEAD', 'CONVERTED', 'CHURNED');

-- CreateEnum
CREATE TYPE "MembershipType" AS ENUM ('NONE', 'STANDARD', 'UNLIMITED');

-- CreateEnum
CREATE TYPE "VisitType" AS ENUM ('CASUAL', 'MEMBER_SESSION', 'LESSON', 'TOURNAMENT', 'PRIVATE_EVENT');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('COURT_RENTAL', 'MEMBERSHIP', 'LESSON', 'PRO_SHOP', 'EVENT', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'PLAYBYPOINT');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('WHATSAPP', 'EMAIL', 'SMS', 'IN_APP');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('DRAFT', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('WELCOME', 'WIN_BACK', 'UPSELL', 'REMINDER', 'PROMO', 'CUSTOM');

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "whatsappPhone" TEXT,
    "source" "PlayerSource" NOT NULL DEFAULT 'OTHER',
    "status" "PlayerStatus" NOT NULL DEFAULT 'NEW',
    "membershipType" "MembershipType" NOT NULL DEFAULT 'NONE',
    "membershipStartDate" TIMESTAMP(3),
    "membershipEndDate" TIMESTAMP(3),
    "monthlyRate" DECIMAL(65,30),
    "notes" TEXT,
    "tags" TEXT[],

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playerId" TEXT NOT NULL,
    "courtNumber" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "type" "VisitType" NOT NULL DEFAULT 'CASUAL',
    "amountPaid" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playerId" TEXT,
    "date" DATE NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "type" "PaymentType" NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CARD',
    "description" TEXT,
    "receiptRef" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyRevenue" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "courtRentals" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "memberships" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "lessons" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "proShop" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "events" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "other" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "DailyRevenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playerId" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "direction" "MessageDirection" NOT NULL DEFAULT 'OUTBOUND',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'DRAFT',
    "templateUsed" TEXT,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "category" "TemplateCategory" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIConversation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messages" JSONB[],
    "title" TEXT,

    CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_email_key" ON "Player"("email");

-- CreateIndex
CREATE INDEX "Player_status_idx" ON "Player"("status");

-- CreateIndex
CREATE INDEX "Player_membershipType_idx" ON "Player"("membershipType");

-- CreateIndex
CREATE INDEX "Player_email_idx" ON "Player"("email");

-- CreateIndex
CREATE INDEX "Visit_playerId_idx" ON "Visit"("playerId");

-- CreateIndex
CREATE INDEX "Visit_date_idx" ON "Visit"("date");

-- CreateIndex
CREATE INDEX "Visit_courtNumber_idx" ON "Visit"("courtNumber");

-- CreateIndex
CREATE INDEX "Payment_playerId_idx" ON "Payment"("playerId");

-- CreateIndex
CREATE INDEX "Payment_date_idx" ON "Payment"("date");

-- CreateIndex
CREATE INDEX "Payment_type_idx" ON "Payment"("type");

-- CreateIndex
CREATE UNIQUE INDEX "DailyRevenue_date_key" ON "DailyRevenue"("date");

-- CreateIndex
CREATE INDEX "DailyRevenue_date_idx" ON "DailyRevenue"("date");

-- CreateIndex
CREATE INDEX "Message_playerId_idx" ON "Message"("playerId");

-- CreateIndex
CREATE INDEX "Message_status_idx" ON "Message"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_name_key" ON "MessageTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
