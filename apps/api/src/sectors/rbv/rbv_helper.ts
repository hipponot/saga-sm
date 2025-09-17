import { DataResponse, ID, StatusResponse } from './base.types.js';
import { inject, injectable } from 'inversify';
import {
  BellSchedule,
  BellScheduleVariant,
  UpsertBellScheduleVariantInput,
  DeleteBellScheduleInput,
  UpsertBellScheduleInput,
  CalculateMeetingTimesInput,
  MeetingTimes,
} from './rbv.types.js';
import { Guid } from 'guid-typescript';
import { type ILogger } from '@hipponot/soa-logger';

import { DayLabelRecurrenceRuleType, DayOfWeekRule, PatternBasedRule, prisma } from '@repo/db';
import { ChronoUnit, LocalDate } from '@js-joda/core';

export const BELL_SCHEDULE_COLLECTION = 'bell_schedules';
export const BELL_SCHEDULE_VARIANT_COLLECTION = 'bell_schedule_variants';
export const PERIOD_COLLECTION = 'periods';

@injectable()
export class RBVHelper {
  private log: ILogger;

  constructor(@inject('ILogger') log: ILogger) {
    this.log = log;
  }

  public async upsert_schedule(
    input: UpsertBellScheduleInput
  ): Promise<DataResponse<BellSchedule>> {
    const create_schedule = await prisma.bellSchedule.upsert({
      where: { id: input.id ?? Guid.raw() },
      update: input,
      create: input,
    });
    const schedule = await this.get_schedule(create_schedule.id);
    /* istanbul ignore if */
    if (!schedule.success) return schedule;
    return { success: true, data: schedule.data };
  }

  public async get_schedule(id: ID): Promise<DataResponse<BellSchedule>> {
    const schedule = await prisma.bellSchedule.findUnique({
      where: { id },
      include: {
        days: {
          include: {
            groups: true,
          },
        },
        variants: {
          include: {
            timeSlots: true,
          },
        },
        groups: true,
        dayLabelRuleSet: {
          include: {
            dayOfWeekRules: true,
            patternBasedRules: true,
          },
        },
        variantRuleSet: true,
      },
    });
    if (!schedule) {
      const msg = 'Requested bell schedule not found';
      this.log.error(msg);
      return { success: false, message: msg };
    }
    return { success: true, data: schedule };
  }

  public async delete_schedule(input: DeleteBellScheduleInput): Promise<StatusResponse> {
    const res = await prisma.bellSchedule.delete({ where: { id: input.id } });
    /* istanbul ignore if */
    if (!res) {
      this.log.error(`Failed to delete bell schedule`);
      return { success: false, message: 'Failed to delete bell schedule' };
    }
    return { success: true };
  }

  public async upsert_variant(
    input: UpsertBellScheduleVariantInput
  ): Promise<DataResponse<BellScheduleVariant>> {
    const variant = await prisma.bellScheduleVariant.upsert({
      where: { id: input.id ?? Guid.raw() },
      update: input,
      create: input,
      include: {
        timeSlots: true,
      }
    });
    /* istanbul ignore if */
    if (!variant) {
      const msg = 'Failed to upsert bell schedule variant';
      this.log.error(msg);
      return { success: false, message: msg };
    }

    return { success: true, data: variant };
  }

  public async calculate_meeting_times(
    input: CalculateMeetingTimesInput
  ): Promise<DataResponse<MeetingTimes>> {
    // 1. Get the schedule
    const schedule_res = await this.get_schedule(input.scheduleId);
    if (!schedule_res.success) return schedule_res;

    const schedule = schedule_res.data;
    if (!schedule.dayLabelRuleSet || !schedule.variantRuleSet) {
      return { success: false, message: 'Schedule missing a recurrence rule set' };
    }

    // 2. Determine which bell schedule days occur on each day of the date range
    const dayMap: Map<LocalDate, string> = new Map(); // Map of date to the scheduleDayId
    switch (schedule.dayLabelRuleSet.type) {
      case DayLabelRecurrenceRuleType.DAY_OF_WEEK:
        const dayOfWeekRules = schedule.dayLabelRuleSet.dayOfWeekRules;
        if (!dayOfWeekRules) {
          return { success: false, message: 'Schedule is day-of-week based but has no day-of-week rules' };
        }

        // Iterate through the date range, pulling the proper day from the rule set
        let date = input.dateRange.start;
        while (!date.isAfter(input.dateRange.end)) {
          const dayOfWeek = date.dayOfWeek().value();
          const day = dayOfWeekRules.find(d => d.dayOfWeek === dayOfWeek);
          dayMap.set(date, day?.scheduleDayId ?? '');

          date = date.plusDays(1);
        }
        break;
      case DayLabelRecurrenceRuleType.PATTERN_BASED:
        const patternBasedRules = schedule.dayLabelRuleSet.patternBasedRules;
        if (!patternBasedRules) {
          return { success: false, message: 'Schedule is pattern-based but has no pattern-based rules' };
        }
        if (!schedule.dayLabelRuleSet.seedDate) {
          return { success: false, message: 'Schedule is pattern-based but has no seed date' };
        }

        // Count only active days when advancing through the pattern
        const seedDate = LocalDate.parse(schedule.dayLabelRuleSet.seedDate);

        const activeDaysSet = new Set(schedule.activeDaysOfWeek);
        const pattern_length = patternBasedRules.length;

        // Find the first active day on or after the start date
        let currentDate = input.dateRange.start;

        // Calculate how many active days have passed since the seed date mathematically
        const activeDaysSinceSeed = this.calculateActiveDaysBetween(
          seedDate,
          currentDate,
          activeDaysSet
        );
        let patternIndex = activeDaysSinceSeed % pattern_length;

        // Iterate through the date range, only advancing pattern on active days
        while (!currentDate.isAfter(input.dateRange.end)) {
          const dayOfWeek = currentDate.dayOfWeek().value() % 7; // Convert to 0-6 (Sunday=0)

          if (activeDaysSet.has(dayOfWeek)) {
            const dayId = patternBasedRules[patternIndex].scheduleDayId;
            dayMap.set(currentDate, dayId);
            patternIndex = (patternIndex + 1) % pattern_length;
          }

          currentDate = currentDate.plusDays(1);
        }
        break;
    }

    // 3. Determine which variants are active on each day of the date range

    // 4. Combine the active variants with the active days to determine the meeting times

    // 5. Return the meeting times

    return { success: true, data: null as unknown as MeetingTimes };
  }

  /**
   * Efficiently calculates the number of active days between two dates using mathematical approach
   * instead of iterating through each day.
   */
  private calculateActiveDaysBetween(
    startDate: LocalDate,
    endDate: LocalDate,
    activeDaysSet: Set<number>
  ): number {
    if (!startDate.isBefore(endDate)) {
      return 0;
    }

    const totalDays = ChronoUnit.DAYS.between(startDate, endDate);
    const fullWeeks = Math.floor(totalDays / 7);
    const remainingDays = totalDays % 7;

    // Count active days in full weeks
    let activeDaysCount = fullWeeks * activeDaysSet.size;

    // Count active days in the remaining partial week
    let currentDate = startDate.plusWeeks(fullWeeks);
    for (let i = 0; i < remainingDays; i++) {
      const dayOfWeek = currentDate.dayOfWeek().value() % 7; // Convert to 0-6 (Sunday=0)
      if (activeDaysSet.has(dayOfWeek)) {
        activeDaysCount++;
      }
      currentDate = currentDate.plusDays(1);
    }

    return activeDaysCount;
  }
}
