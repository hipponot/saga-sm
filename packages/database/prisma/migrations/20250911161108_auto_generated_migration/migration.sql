-- CreateTable
CREATE TABLE "DayRecurrenceRuleSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "seedDate" DATETIME,
    CONSTRAINT "DayRecurrenceRuleSet_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "BellSchedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DayOfWeekRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dayOfWeek" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "scheduleDayId" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    CONSTRAINT "DayOfWeekRule_scheduleDayId_fkey" FOREIGN KEY ("scheduleDayId") REFERENCES "BellScheduleDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DayOfWeekRule_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "DayRecurrenceRuleSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PatternBasedRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patternPosition" INTEGER NOT NULL,
    "scheduleDayId" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    CONSTRAINT "PatternBasedRule_scheduleDayId_fkey" FOREIGN KEY ("scheduleDayId") REFERENCES "BellScheduleDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PatternBasedRule_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "DayRecurrenceRuleSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DayRecurrenceRuleSet_scheduleId_key" ON "DayRecurrenceRuleSet"("scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "DayOfWeekRule_ruleSetId_dayOfWeek_key" ON "DayOfWeekRule"("ruleSetId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "PatternBasedRule_ruleSetId_patternPosition_key" ON "PatternBasedRule"("ruleSetId", "patternPosition");
