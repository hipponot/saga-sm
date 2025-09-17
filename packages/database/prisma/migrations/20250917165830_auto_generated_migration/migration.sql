/*
  Warnings:

  - You are about to drop the column `recurrenceRuleSet` on the `BellScheduleVariant` table. All the data in the column will be lost.
  - You are about to drop the column `scheduleDayId` on the `BellScheduleVariant` table. All the data in the column will be lost.
  - You are about to drop the column `scheduleId` on the `TimeSlot` table. All the data in the column will be lost.
  - You are about to drop the `DayRecurrenceRuleSet` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_BellScheduleDayToTimeSlot` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `scheduleId` to the `BellScheduleVariant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `variantId` to the `TimeSlot` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."DayLabelRecurrenceRuleType" AS ENUM ('DAY_OF_WEEK', 'PATTERN_BASED');

-- DropForeignKey
ALTER TABLE "public"."BellScheduleVariant" DROP CONSTRAINT "BellScheduleVariant_scheduleDayId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DayOfWeekRule" DROP CONSTRAINT "DayOfWeekRule_ruleSetId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DayRecurrenceRuleSet" DROP CONSTRAINT "DayRecurrenceRuleSet_scheduleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PatternBasedRule" DROP CONSTRAINT "PatternBasedRule_ruleSetId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TimeSlot" DROP CONSTRAINT "TimeSlot_scheduleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."_BellScheduleDayToTimeSlot" DROP CONSTRAINT "_BellScheduleDayToTimeSlot_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_BellScheduleDayToTimeSlot" DROP CONSTRAINT "_BellScheduleDayToTimeSlot_B_fkey";

-- AlterTable
ALTER TABLE "public"."BellScheduleVariant" DROP COLUMN "recurrenceRuleSet",
DROP COLUMN "scheduleDayId",
ADD COLUMN     "scheduleId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."TimeSlot" DROP COLUMN "scheduleId",
ADD COLUMN     "variantId" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."DayRecurrenceRuleSet";

-- DropTable
DROP TABLE "public"."_BellScheduleDayToTimeSlot";

-- DropEnum
DROP TYPE "public"."RecurrenceRuleType";

-- CreateTable
CREATE TABLE "public"."BellScheduleGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scheduleId" TEXT NOT NULL,

    CONSTRAINT "BellScheduleGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VariantRuleSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scheduleId" TEXT NOT NULL,

    CONSTRAINT "VariantRuleSet_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "VariantRuleSet_scheduleId_key" ON "public"."VariantRuleSet"("scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "DayLabelRuleSet_scheduleId_key" ON "public"."DayLabelRuleSet"("scheduleId");

-- AddForeignKey
ALTER TABLE "public"."BellScheduleGroup" ADD CONSTRAINT "BellScheduleGroup_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."BellSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BellScheduleVariant" ADD CONSTRAINT "BellScheduleVariant_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."BellSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimeSlot" ADD CONSTRAINT "TimeSlot_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."BellScheduleVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VariantRuleSet" ADD CONSTRAINT "VariantRuleSet_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."BellSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DayLabelRuleSet" ADD CONSTRAINT "DayLabelRuleSet_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."BellSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DayOfWeekRule" ADD CONSTRAINT "DayOfWeekRule_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "public"."DayLabelRuleSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatternBasedRule" ADD CONSTRAINT "PatternBasedRule_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "public"."DayLabelRuleSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
