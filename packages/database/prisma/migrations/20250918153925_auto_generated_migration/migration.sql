-- CreateEnum
CREATE TYPE "public"."DayLabelRecurrenceRuleType" AS ENUM ('DAY_OF_WEEK', 'PATTERN_BASED');

-- CreateTable
CREATE TABLE "public"."BellSchedule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "activeDaysOfWeek" INTEGER[],

    CONSTRAINT "BellSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BellScheduleGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scheduleId" TEXT NOT NULL,

    CONSTRAINT "BellScheduleGroup_pkey" PRIMARY KEY ("id")
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
    "scheduleId" TEXT NOT NULL,

    CONSTRAINT "BellScheduleVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TimeSlot" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start" TEXT NOT NULL,
    "end" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,

    CONSTRAINT "TimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VariantRuleSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultVariantId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,

    CONSTRAINT "VariantRuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExceptionBasedRule" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "variantRuleSetId" TEXT NOT NULL,

    CONSTRAINT "ExceptionBasedRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DayLabelRuleSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."DayLabelRecurrenceRuleType" NOT NULL,
    "description" TEXT,
    "seedDate" TEXT,
    "scheduleId" TEXT NOT NULL,

    CONSTRAINT "DayLabelRuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DayOfWeekRule" (
    "id" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "scheduleDayId" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,

    CONSTRAINT "DayOfWeekRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PatternBasedRule" (
    "id" TEXT NOT NULL,
    "patternPosition" INTEGER NOT NULL,
    "scheduleDayId" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,

    CONSTRAINT "PatternBasedRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_BellScheduleDayToBellScheduleGroup" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BellScheduleDayToBellScheduleGroup_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "BellScheduleGroup_scheduleId_idx" ON "public"."BellScheduleGroup"("scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "BellScheduleDay_scheduleId_id_key" ON "public"."BellScheduleDay"("scheduleId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "VariantRuleSet_defaultVariantId_key" ON "public"."VariantRuleSet"("defaultVariantId");

-- CreateIndex
CREATE UNIQUE INDEX "VariantRuleSet_scheduleId_key" ON "public"."VariantRuleSet"("scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "DayLabelRuleSet_scheduleId_key" ON "public"."DayLabelRuleSet"("scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "DayOfWeekRule_ruleSetId_dayOfWeek_key" ON "public"."DayOfWeekRule"("ruleSetId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "PatternBasedRule_ruleSetId_patternPosition_key" ON "public"."PatternBasedRule"("ruleSetId", "patternPosition");

-- CreateIndex
CREATE INDEX "_BellScheduleDayToBellScheduleGroup_B_index" ON "public"."_BellScheduleDayToBellScheduleGroup"("B");

-- AddForeignKey
ALTER TABLE "public"."BellScheduleGroup" ADD CONSTRAINT "BellScheduleGroup_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."BellSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BellScheduleDay" ADD CONSTRAINT "BellScheduleDay_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."BellSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BellScheduleVariant" ADD CONSTRAINT "BellScheduleVariant_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."BellSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimeSlot" ADD CONSTRAINT "TimeSlot_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."BellScheduleVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VariantRuleSet" ADD CONSTRAINT "VariantRuleSet_defaultVariantId_fkey" FOREIGN KEY ("defaultVariantId") REFERENCES "public"."BellScheduleVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VariantRuleSet" ADD CONSTRAINT "VariantRuleSet_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."BellSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExceptionBasedRule" ADD CONSTRAINT "ExceptionBasedRule_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."BellScheduleVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExceptionBasedRule" ADD CONSTRAINT "ExceptionBasedRule_variantRuleSetId_fkey" FOREIGN KEY ("variantRuleSetId") REFERENCES "public"."VariantRuleSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DayLabelRuleSet" ADD CONSTRAINT "DayLabelRuleSet_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."BellSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DayOfWeekRule" ADD CONSTRAINT "DayOfWeekRule_scheduleId_scheduleDayId_fkey" FOREIGN KEY ("scheduleId", "scheduleDayId") REFERENCES "public"."BellScheduleDay"("scheduleId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DayOfWeekRule" ADD CONSTRAINT "DayOfWeekRule_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "public"."DayLabelRuleSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DayOfWeekRule" ADD CONSTRAINT "DayOfWeekRule_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."BellSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatternBasedRule" ADD CONSTRAINT "PatternBasedRule_scheduleId_scheduleDayId_fkey" FOREIGN KEY ("scheduleId", "scheduleDayId") REFERENCES "public"."BellScheduleDay"("scheduleId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatternBasedRule" ADD CONSTRAINT "PatternBasedRule_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "public"."DayLabelRuleSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatternBasedRule" ADD CONSTRAINT "PatternBasedRule_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."BellSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_BellScheduleDayToBellScheduleGroup" ADD CONSTRAINT "_BellScheduleDayToBellScheduleGroup_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."BellScheduleDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_BellScheduleDayToBellScheduleGroup" ADD CONSTRAINT "_BellScheduleDayToBellScheduleGroup_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."BellScheduleGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
