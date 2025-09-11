-- CreateTable
CREATE TABLE "BellSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "BellScheduleDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scheduleId" TEXT NOT NULL,
    CONSTRAINT "BellScheduleDay_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "BellSchedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BellScheduleVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN DEFAULT false,
    "recurrenceRuleSet" TEXT NOT NULL,
    "scheduleDayId" TEXT NOT NULL,
    CONSTRAINT "BellScheduleVariant_scheduleDayId_fkey" FOREIGN KEY ("scheduleDayId") REFERENCES "BellScheduleDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Period" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "start" TEXT NOT NULL,
    "end" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    CONSTRAINT "Period_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "BellSchedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_BellScheduleDayToPeriod" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_BellScheduleDayToPeriod_A_fkey" FOREIGN KEY ("A") REFERENCES "BellScheduleDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_BellScheduleDayToPeriod_B_fkey" FOREIGN KEY ("B") REFERENCES "Period" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_BellScheduleDayToPeriod_AB_unique" ON "_BellScheduleDayToPeriod"("A", "B");

-- CreateIndex
CREATE INDEX "_BellScheduleDayToPeriod_B_index" ON "_BellScheduleDayToPeriod"("B");
