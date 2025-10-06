-- DropForeignKey
ALTER TABLE "public"."DayOfWeekRule" DROP CONSTRAINT "DayOfWeekRule_scheduleId_scheduleDayId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PatternBasedRule" DROP CONSTRAINT "PatternBasedRule_scheduleId_scheduleDayId_fkey";

-- DropIndex
DROP INDEX "public"."BellScheduleDay_scheduleId_id_key";

-- AddForeignKey
ALTER TABLE "public"."DayOfWeekRule" ADD CONSTRAINT "DayOfWeekRule_scheduleDayId_fkey" FOREIGN KEY ("scheduleDayId") REFERENCES "public"."BellScheduleDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatternBasedRule" ADD CONSTRAINT "PatternBasedRule_scheduleDayId_fkey" FOREIGN KEY ("scheduleDayId") REFERENCES "public"."BellScheduleDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
