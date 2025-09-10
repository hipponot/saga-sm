-- CreateTable
CREATE TABLE "BellSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "BellScheduleVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN DEFAULT false,
    "recurrenceRuleSet" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    CONSTRAINT "BellScheduleVariant_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "BellSchedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Period" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "start" TEXT NOT NULL,
    "end" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    CONSTRAINT "Period_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "BellScheduleVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
