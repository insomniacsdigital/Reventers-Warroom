-- CreateEnum
CREATE TYPE "PersonRole" AS ENUM ('IP_CS', 'DESIGNER', 'EDITOR');

-- CreateEnum
CREATE TYPE "StatusState" AS ENUM ('PENDING', 'PARTIAL', 'DONE');

-- CreateEnum
CREATE TYPE "Week" AS ENUM ('W1', 'W2', 'W3', 'W4');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT');

-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "leaderName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ip" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultWeeklyTarget" INTEGER NOT NULL,

    CONSTRAINT "Ip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonAssignment" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "ipId" TEXT NOT NULL,
    "role" "PersonRole" NOT NULL,

    CONSTRAINT "PersonAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientIpStatus" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "ipId" TEXT NOT NULL,
    "status" "StatusState" NOT NULL DEFAULT 'PENDING',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientIpStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RotationCycle" (
    "id" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RotationCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RotationEntry" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "ipId" TEXT NOT NULL,
    "week" "Week" NOT NULL,
    "target" INTEGER NOT NULL,
    "achieved" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RotationEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RotationAssignment" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,

    CONSTRAINT "RotationAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "ipId" TEXT NOT NULL,
    "week" "Week" NOT NULL,
    "releasedCohortId" TEXT NOT NULL,
    "claimedCohortId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CohortWeeklyStatus" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "ipId" TEXT NOT NULL,
    "week" "Week" NOT NULL,
    "status" "StatusState" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "CohortWeeklyStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cohort_code_key" ON "Cohort"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Client_cohortId_name_key" ON "Client"("cohortId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Ip_name_key" ON "Ip"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Person_name_key" ON "Person"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PersonAssignment_personId_ipId_role_key" ON "PersonAssignment"("personId", "ipId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "ClientIpStatus_clientId_ipId_key" ON "ClientIpStatus"("clientId", "ipId");

-- CreateIndex
CREATE UNIQUE INDEX "RotationCycle_monthKey_key" ON "RotationCycle"("monthKey");

-- CreateIndex
CREATE UNIQUE INDEX "RotationEntry_cycleId_ipId_week_key" ON "RotationEntry"("cycleId", "ipId", "week");

-- CreateIndex
CREATE UNIQUE INDEX "RotationAssignment_entryId_cohortId_key" ON "RotationAssignment"("entryId", "cohortId");

-- CreateIndex
CREATE UNIQUE INDEX "CohortWeeklyStatus_cycleId_cohortId_ipId_week_key" ON "CohortWeeklyStatus"("cycleId", "cohortId", "ipId", "week");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_personId_date_key" ON "AttendanceRecord"("personId", "date");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonAssignment" ADD CONSTRAINT "PersonAssignment_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonAssignment" ADD CONSTRAINT "PersonAssignment_ipId_fkey" FOREIGN KEY ("ipId") REFERENCES "Ip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientIpStatus" ADD CONSTRAINT "ClientIpStatus_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientIpStatus" ADD CONSTRAINT "ClientIpStatus_ipId_fkey" FOREIGN KEY ("ipId") REFERENCES "Ip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotationEntry" ADD CONSTRAINT "RotationEntry_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "RotationCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotationEntry" ADD CONSTRAINT "RotationEntry_ipId_fkey" FOREIGN KEY ("ipId") REFERENCES "Ip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotationAssignment" ADD CONSTRAINT "RotationAssignment_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "RotationEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotationAssignment" ADD CONSTRAINT "RotationAssignment_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "RotationCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_ipId_fkey" FOREIGN KEY ("ipId") REFERENCES "Ip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_releasedCohortId_fkey" FOREIGN KEY ("releasedCohortId") REFERENCES "Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_claimedCohortId_fkey" FOREIGN KEY ("claimedCohortId") REFERENCES "Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortWeeklyStatus" ADD CONSTRAINT "CohortWeeklyStatus_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "RotationCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortWeeklyStatus" ADD CONSTRAINT "CohortWeeklyStatus_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortWeeklyStatus" ADD CONSTRAINT "CohortWeeklyStatus_ipId_fkey" FOREIGN KEY ("ipId") REFERENCES "Ip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
