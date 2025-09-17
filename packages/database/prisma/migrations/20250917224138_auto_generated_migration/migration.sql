/*
  Warnings:

  - You are about to drop the column `dayId` on the `BellScheduleGroup` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."BellScheduleGroup" DROP CONSTRAINT "BellScheduleGroup_dayId_fkey";

-- AlterTable
ALTER TABLE "public"."BellScheduleGroup" DROP COLUMN "dayId";

-- CreateTable
CREATE TABLE "public"."_BellScheduleDayToBellScheduleGroup" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BellScheduleDayToBellScheduleGroup_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_BellScheduleDayToBellScheduleGroup_B_index" ON "public"."_BellScheduleDayToBellScheduleGroup"("B");

-- CreateIndex
CREATE INDEX "BellScheduleGroup_scheduleId_idx" ON "public"."BellScheduleGroup"("scheduleId");

-- AddForeignKey
ALTER TABLE "public"."_BellScheduleDayToBellScheduleGroup" ADD CONSTRAINT "_BellScheduleDayToBellScheduleGroup_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."BellScheduleDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_BellScheduleDayToBellScheduleGroup" ADD CONSTRAINT "_BellScheduleDayToBellScheduleGroup_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."BellScheduleGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
