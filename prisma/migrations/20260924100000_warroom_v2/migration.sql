-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('ADMIN', 'COHORT_LEADER', 'IP_CS', 'DESIGNER', 'EDITOR', 'FLOATER');

-- CreateEnum
CREATE TYPE "FestiveFormat" AS ENUM ('STATIC', 'STORY', 'REEL');

-- DropForeignKey
ALTER TABLE "AttendanceRecord" DROP CONSTRAINT "AttendanceRecord_personId_fkey";

-- DropForeignKey
ALTER TABLE "ClientIpStatus" DROP CONSTRAINT "ClientIpStatus_clientId_fkey";

-- DropForeignKey
ALTER TABLE "ClientIpStatus" DROP CONSTRAINT "ClientIpStatus_ipId_fkey";

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "addedMonthKey" TEXT,
ADD COLUMN     "archivedMonthKey" TEXT;

-- AlterTable
ALTER TABLE "Cohort" ADD COLUMN     "leaderPersonId" TEXT;

-- AlterTable
ALTER TABLE "Ip" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "appRole" "AppRole" NOT NULL DEFAULT 'EDITOR',
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "passwordHash" TEXT;

-- DropTable
DROP TABLE "AttendanceRecord";

-- DropTable
DROP TABLE "ClientIpStatus";

-- DropEnum
DROP TYPE "AttendanceStatus";

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandIpMonth" (
    "id" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "ipId" TEXT NOT NULL,
    "target" INTEGER NOT NULL DEFAULT 0,
    "achieved" INTEGER NOT NULL DEFAULT 0,
    "live" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandIpMonth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthSetting" (
    "monthKey" TEXT NOT NULL,
    "baseOverride" INTEGER,
    "achievedOverride" INTEGER,

    CONSTRAINT "MonthSetting_pkey" PRIMARY KEY ("monthKey")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Festival" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "dateLabel" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Festival_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FestiveEntry" (
    "id" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "format" "FestiveFormat" NOT NULL,
    "target" INTEGER NOT NULL DEFAULT 0,
    "achieved" INTEGER NOT NULL DEFAULT 0,
    "live" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FestiveEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NonIpEntry" (
    "id" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "target" INTEGER NOT NULL DEFAULT 0,
    "achieved" INTEGER NOT NULL DEFAULT 0,
    "live" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NonIpEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceDay" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "clockIn" TIMESTAMP(3) NOT NULL,
    "clockOut" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "AttendanceDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "BrandIpMonth_monthKey_idx" ON "BrandIpMonth"("monthKey");

-- CreateIndex
CREATE UNIQUE INDEX "BrandIpMonth_monthKey_brandId_ipId_key" ON "BrandIpMonth"("monthKey", "brandId", "ipId");

-- CreateIndex
CREATE INDEX "FestiveEntry_monthKey_idx" ON "FestiveEntry"("monthKey");

-- CreateIndex
CREATE UNIQUE INDEX "FestiveEntry_monthKey_brandId_festivalId_format_key" ON "FestiveEntry"("monthKey", "brandId", "festivalId", "format");

-- CreateIndex
CREATE INDEX "NonIpEntry_monthKey_idx" ON "NonIpEntry"("monthKey");

-- CreateIndex
CREATE UNIQUE INDEX "NonIpEntry_monthKey_brandId_key" ON "NonIpEntry"("monthKey", "brandId");

-- CreateIndex
CREATE INDEX "AttendanceDay_day_idx" ON "AttendanceDay"("day");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceDay_personId_day_key" ON "AttendanceDay"("personId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "Person_email_key" ON "Person"("email");

-- AddForeignKey
ALTER TABLE "Cohort" ADD CONSTRAINT "Cohort_leaderPersonId_fkey" FOREIGN KEY ("leaderPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandIpMonth" ADD CONSTRAINT "BrandIpMonth_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandIpMonth" ADD CONSTRAINT "BrandIpMonth_ipId_fkey" FOREIGN KEY ("ipId") REFERENCES "Ip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FestiveEntry" ADD CONSTRAINT "FestiveEntry_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FestiveEntry" ADD CONSTRAINT "FestiveEntry_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonIpEntry" ADD CONSTRAINT "NonIpEntry_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceDay" ADD CONSTRAINT "AttendanceDay_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

