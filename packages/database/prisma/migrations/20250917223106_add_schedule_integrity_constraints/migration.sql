/*
  Warnings:

  - A unique constraint covering the columns `[scheduleId,id]` on the table `BellScheduleDay` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `dayId` to the `BellScheduleGroup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduleId` to the `DayOfWeekRule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduleId` to the `PatternBasedRule` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."DayOfWeekRule" DROP CONSTRAINT "DayOfWeekRule_scheduleDayId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PatternBasedRule" DROP CONSTRAINT "PatternBasedRule_scheduleDayId_fkey";

-- AlterTable
ALTER TABLE "public"."BellScheduleGroup" ADD COLUMN     "dayId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."DayOfWeekRule" ADD COLUMN     "scheduleId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."PatternBasedRule" ADD COLUMN     "scheduleId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BellScheduleDay_scheduleId_id_key" ON "public"."BellScheduleDay"("scheduleId", "id");

-- AddForeignKey
ALTER TABLE "public"."BellScheduleGroup" ADD CONSTRAINT "BellScheduleGroup_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "public"."BellScheduleDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DayOfWeekRule" ADD CONSTRAINT "DayOfWeekRule_scheduleId_scheduleDayId_fkey" FOREIGN KEY ("scheduleId", "scheduleDayId") REFERENCES "public"."BellScheduleDay"("scheduleId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DayOfWeekRule" ADD CONSTRAINT "DayOfWeekRule_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."BellSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatternBasedRule" ADD CONSTRAINT "PatternBasedRule_scheduleId_scheduleDayId_fkey" FOREIGN KEY ("scheduleId", "scheduleDayId") REFERENCES "public"."BellScheduleDay"("scheduleId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatternBasedRule" ADD CONSTRAINT "PatternBasedRule_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."BellSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
