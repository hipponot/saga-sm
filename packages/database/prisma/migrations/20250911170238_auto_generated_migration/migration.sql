-- CreateEnum
CREATE TYPE "public"."RecurrenceRuleType" AS ENUM ('DAY_OF_WEEK', 'PATTERN_BASED');

-- CreateTable
CREATE TABLE "public"."BellSchedule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "activeDaysOfWeek" INTEGER[],

    CONSTRAINT "BellSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BellScheduleDay" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scheduleId" TEXT NOT NULL,

    CONSTRAINT "BellScheduleDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BellScheduleVariant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "recurrenceRuleSet" TEXT NOT NULL,
    "scheduleDayId" TEXT NOT NULL,

    CONSTRAINT "BellScheduleVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Period" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start" TEXT NOT NULL,
    "end" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,

    CONSTRAINT "Period_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DayRecurrenceRuleSet" (
    "id" TEXT NOT NULL,
    "type" "public"."RecurrenceRuleType" NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "seedDate" TIMESTAMP(3),

    CONSTRAINT "DayRecurrenceRuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DayOfWeekRule" (
    "id" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "scheduleDayId" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,

    CONSTRAINT "DayOfWeekRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PatternBasedRule" (
    "id" TEXT NOT NULL,
    "patternPosition" INTEGER NOT NULL,
    "scheduleDayId" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,

    CONSTRAINT "PatternBasedRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_BellScheduleDayToPeriod" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BellScheduleDayToPeriod_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "DayRecurrenceRuleSet_scheduleId_key" ON "public"."DayRecurrenceRuleSet"("scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "DayOfWeekRule_ruleSetId_dayOfWeek_key" ON "public"."DayOfWeekRule"("ruleSetId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "PatternBasedRule_ruleSetId_patternPosition_key" ON "public"."PatternBasedRule"("ruleSetId", "patternPosition");

-- CreateIndex
CREATE INDEX "_BellScheduleDayToPeriod_B_index" ON "public"."_BellScheduleDayToPeriod"("B");

-- AddForeignKey
ALTER TABLE "public"."BellScheduleDay" ADD CONSTRAINT "BellScheduleDay_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."BellSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BellScheduleVariant" ADD CONSTRAINT "BellScheduleVariant_scheduleDayId_fkey" FOREIGN KEY ("scheduleDayId") REFERENCES "public"."BellScheduleDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Period" ADD CONSTRAINT "Period_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."BellSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DayRecurrenceRuleSet" ADD CONSTRAINT "DayRecurrenceRuleSet_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."BellSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DayOfWeekRule" ADD CONSTRAINT "DayOfWeekRule_scheduleDayId_fkey" FOREIGN KEY ("scheduleDayId") REFERENCES "public"."BellScheduleDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DayOfWeekRule" ADD CONSTRAINT "DayOfWeekRule_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "public"."DayRecurrenceRuleSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatternBasedRule" ADD CONSTRAINT "PatternBasedRule_scheduleDayId_fkey" FOREIGN KEY ("scheduleDayId") REFERENCES "public"."BellScheduleDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatternBasedRule" ADD CONSTRAINT "PatternBasedRule_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "public"."DayRecurrenceRuleSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_BellScheduleDayToPeriod" ADD CONSTRAINT "_BellScheduleDayToPeriod_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."BellScheduleDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_BellScheduleDayToPeriod" ADD CONSTRAINT "_BellScheduleDayToPeriod_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
