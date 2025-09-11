/*
  Warnings:

  - You are about to drop the `Period` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_BellScheduleDayToPeriod` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Period" DROP CONSTRAINT "Period_scheduleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."_BellScheduleDayToPeriod" DROP CONSTRAINT "_BellScheduleDayToPeriod_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_BellScheduleDayToPeriod" DROP CONSTRAINT "_BellScheduleDayToPeriod_B_fkey";

-- DropTable
DROP TABLE "public"."Period";

-- DropTable
DROP TABLE "public"."_BellScheduleDayToPeriod";

-- CreateTable
CREATE TABLE "public"."TimeSlot" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start" TEXT NOT NULL,
    "end" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,

    CONSTRAINT "TimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_BellScheduleDayToTimeSlot" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BellScheduleDayToTimeSlot_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_BellScheduleDayToTimeSlot_B_index" ON "public"."_BellScheduleDayToTimeSlot"("B");

-- AddForeignKey
ALTER TABLE "public"."TimeSlot" ADD CONSTRAINT "TimeSlot_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."BellSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_BellScheduleDayToTimeSlot" ADD CONSTRAINT "_BellScheduleDayToTimeSlot_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."BellScheduleDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_BellScheduleDayToTimeSlot" ADD CONSTRAINT "_BellScheduleDayToTimeSlot_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."TimeSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
