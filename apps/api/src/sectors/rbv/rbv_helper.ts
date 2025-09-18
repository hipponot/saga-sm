import { DataResponse, ID, StatusResponse } from './base.types.js';
import { inject, injectable } from 'inversify';
import {
  BellSchedule,
  BellScheduleDay,
  BellScheduleVariant,
  UpsertBellScheduleVariantInput,
  UpsertBellScheduleDayInput,
  DeleteBellScheduleDayInput,
  DeleteBellScheduleInput,
  UpsertBellScheduleInput,
  CalculateMeetingTimesInput,
  MeetingTimes,
  DayLabelRuleSet,
  UpsertDayLabelRuleSetInput,
  DeleteDayLabelRuleSetInput,
  VariantRuleSet,
  UpsertVariantRuleSetInput,
  DeleteVariantRuleSetInput,
  UpsertTimeSlotInput,
  DeleteTimeSlotInput,
  UpsertDayOfWeekRuleInput,
  DeleteDayOfWeekRuleInput,
  UpsertPatternBasedRuleInput,
  DeletePatternBasedRuleInput,
  UpsertExceptionBasedRuleInput,
  DeleteExceptionBasedRuleInput,
  UpsertBellScheduleGroupInput,
  DeleteBellScheduleGroupInput,
} from './rbv.types.js';
import { Guid } from 'guid-typescript';
import { type ILogger } from '@hipponot/soa-logger';

import {
  BellScheduleGroup,
  DayLabelRecurrenceRuleType,
  DayOfWeekRule,
  PatternBasedRule,
  TimeSlot,
  ExceptionBasedRule,
  prisma,
} from '@repo/db';
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
    const id = input.id ?? Guid.raw();
    const create_schedule = await prisma.bellSchedule.upsert({
      where: { id },
      update: input,
      create: { ...input, id },
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
        variantRuleSet: {
          include: {
            exceptions: true,
          },
        },
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
    const id = input.id ?? Guid.raw();
    const variant = await prisma.bellScheduleVariant.upsert({
      where: { id },
      update: input,
      create: { ...input, id },
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

  // ============================================================================
  // BELL SCHEDULE DAY CRUD OPERATIONS
  // ============================================================================

  public async upsert_schedule_group(
    input: UpsertBellScheduleGroupInput
  ): Promise<DataResponse<BellScheduleGroup>> {
    const id = input.id ?? Guid.raw();
    const schedule_group = await prisma.bellScheduleGroup.upsert({
      where: { id },
      update: {
        name: input.name,
        description: input.description,
        scheduleId: input.scheduleId,
      },
      create: {
        id,
        name: input.name,
        description: input.description,
        scheduleId: input.scheduleId,
      },
    });
    
    /* istanbul ignore if */
    if (!schedule_group) {
      const msg = 'Failed to upsert bell schedule group';
      this.log.error(msg);
      return { success: false, message: msg };
    }

    return { success: true, data: schedule_group };
  }

  public async get_schedule_group(id: ID): Promise<DataResponse<BellScheduleGroup>> {
    const schedule_group = await prisma.bellScheduleGroup.findUnique({
      where: { id },
    });
    
    if (!schedule_group) {
      const msg = 'Requested bell schedule group not found';
      this.log.error(msg);
      return { success: false, message: msg };
    }
    
    return { success: true, data: schedule_group };
  }

  public async delete_schedule_group(input: DeleteBellScheduleGroupInput): Promise<StatusResponse> {
    const res = await prisma.bellScheduleGroup.delete({ where: { id: input.id } });
    
    /* istanbul ignore if */
    if (!res) {
      this.log.error(`Failed to delete bell schedule group`);
      return { success: false, message: 'Failed to delete bell schedule group' };
    }
    
    return { success: true };
  }

  public async upsert_schedule_day(
    input: UpsertBellScheduleDayInput
  ): Promise<DataResponse<BellScheduleDay>> {
    const id = input.id ?? Guid.raw();
    const schedule_day = await prisma.bellScheduleDay.upsert({
      where: { id },
      update: {
        name: input.name,
        description: input.description,
        scheduleId: input.scheduleId,
      },
      create: {
        id,
        name: input.name,
        description: input.description,
        scheduleId: input.scheduleId,
      },
      include: {
        groups: true,
      },
    });
    
    /* istanbul ignore if */
    if (!schedule_day) {
      const msg = 'Failed to upsert bell schedule day';
      this.log.error(msg);
      return { success: false, message: msg };
    }

    return { success: true, data: schedule_day };
  }

  public async get_schedule_day(id: ID): Promise<DataResponse<BellScheduleDay>> {
    const schedule_day = await prisma.bellScheduleDay.findUnique({
      where: { id },
      include: {
        groups: true,
      },
    });
    
    if (!schedule_day) {
      const msg = 'Requested bell schedule day not found';
      this.log.error(msg);
      return { success: false, message: msg };
    }
    
    return { success: true, data: schedule_day };
  }

  public async delete_schedule_day(input: DeleteBellScheduleDayInput): Promise<StatusResponse> {
    const res = await prisma.bellScheduleDay.delete({ where: { id: input.id } });
    
    /* istanbul ignore if */
    if (!res) {
      this.log.error(`Failed to delete bell schedule day`);
      return { success: false, message: 'Failed to delete bell schedule day' };
    }
    
    return { success: true };
  }

  // ============================================================================
  // DAY LABEL RULE SET CRUD OPERATIONS
  // ============================================================================

  public async upsert_day_label_rule_set(
    input: UpsertDayLabelRuleSetInput
  ): Promise<DataResponse<DayLabelRuleSet>> {
    const rule_set = await prisma.dayLabelRuleSet.upsert({
      where: { id: input.id ?? Guid.raw() },
      update: {
        name: input.name,
        type: input.type,
        description: input.description,
        seedDate: input.seedDate,
        scheduleId: input.scheduleId,
      },
      create: {
        id: input.id ?? Guid.raw(),
        name: input.name,
        type: input.type,
        description: input.description,
        seedDate: input.seedDate,
        scheduleId: input.scheduleId,
      },
      include: {
        dayOfWeekRules: true,
        patternBasedRules: true,
      },
    });
    
    /* istanbul ignore if */
    if (!rule_set) {
      const msg = 'Failed to upsert day label rule set';
      this.log.error(msg);
      return { success: false, message: msg };
    }

    return { success: true, data: rule_set };
  }

  public async get_day_label_rule_set(id: ID): Promise<DataResponse<DayLabelRuleSet>> {
    const rule_set = await prisma.dayLabelRuleSet.findUnique({
      where: { id },
      include: {
        dayOfWeekRules: true,
        patternBasedRules: true,
      },
    });
    
    if (!rule_set) {
      const msg = 'Requested day label rule set not found';
      this.log.error(msg);
      return { success: false, message: msg };
    }
    
    return { success: true, data: rule_set };
  }

  public async delete_day_label_rule_set(input: DeleteDayLabelRuleSetInput): Promise<StatusResponse> {
    const res = await prisma.dayLabelRuleSet.delete({ where: { id: input.id } });
    
    /* istanbul ignore if */
    if (!res) {
      this.log.error(`Failed to delete day label rule set`);
      return { success: false, message: 'Failed to delete day label rule set' };
    }
    
    return { success: true };
  }

  // ============================================================================
  // VARIANT RULE SET CRUD OPERATIONS
  // ============================================================================

  public async upsert_variant_rule_set(
    input: UpsertVariantRuleSetInput
  ): Promise<DataResponse<VariantRuleSet>> {
    const rule_set = await prisma.variantRuleSet.upsert({
      where: { id: input.id ?? Guid.raw() },
      update: {
        name: input.name,
        description: input.description,
        defaultVariantId: input.defaultVariantId,
        scheduleId: input.scheduleId,
      },
      create: {
        id: input.id ?? Guid.raw(),
        name: input.name,
        description: input.description,
        defaultVariantId: input.defaultVariantId,
        scheduleId: input.scheduleId,
      },
      include: {
        exceptions: true,
      },
    });
    
    /* istanbul ignore if */
    if (!rule_set) {
      const msg = 'Failed to upsert variant rule set';
      this.log.error(msg);
      return { success: false, message: msg };
    }

    return { success: true, data: rule_set };
  }

  public async get_variant_rule_set(id: ID): Promise<DataResponse<VariantRuleSet>> {
    const rule_set = await prisma.variantRuleSet.findUnique({
      where: { id },
      include: {
        exceptions: true,
      },
    });
    
    if (!rule_set) {
      const msg = 'Requested variant rule set not found';
      this.log.error(msg);
      return { success: false, message: msg };
    }
    
    return { success: true, data: rule_set };
  }

  public async delete_variant_rule_set(input: DeleteVariantRuleSetInput): Promise<StatusResponse> {
    const res = await prisma.variantRuleSet.delete({ where: { id: input.id } });
    
    /* istanbul ignore if */
    if (!res) {
      this.log.error(`Failed to delete variant rule set`);
      return { success: false, message: 'Failed to delete variant rule set' };
    }
    
    return { success: true };
  }

  // ============================================================================
  // TIME SLOT CRUD OPERATIONS
  // ============================================================================

  public async upsert_time_slot(
    input: UpsertTimeSlotInput
  ): Promise<DataResponse<TimeSlot>> {
    const time_slot = await prisma.timeSlot.upsert({
      where: { id: input.id ?? Guid.raw() },
      update: {
        name: input.name,
        start: input.start,
        end: input.end,
        variantId: input.variantId,
      },
      create: {
        id: input.id ?? Guid.raw(),
        name: input.name,
        start: input.start,
        end: input.end,
        variantId: input.variantId,
      },
    });
    
    /* istanbul ignore if */
    if (!time_slot) {
      const msg = 'Failed to upsert time slot';
      this.log.error(msg);
      return { success: false, message: msg };
    }

    return { success: true, data: time_slot };
  }

  public async get_time_slot(id: ID): Promise<DataResponse<TimeSlot>> {
    const time_slot = await prisma.timeSlot.findUnique({
      where: { id },
    });
    
    if (!time_slot) {
      const msg = 'Requested time slot not found';
      this.log.error(msg);
      return { success: false, message: msg };
    }
    
    return { success: true, data: time_slot };
  }

  public async delete_time_slot(input: DeleteTimeSlotInput): Promise<StatusResponse> {
    const res = await prisma.timeSlot.delete({ where: { id: input.id } });
    
    /* istanbul ignore if */
    if (!res) {
      this.log.error(`Failed to delete time slot`);
      return { success: false, message: 'Failed to delete time slot' };
    }
    
    return { success: true };
  }

  // ============================================================================
  // DAY OF WEEK RULE CRUD OPERATIONS
  // ============================================================================

  public async upsert_day_of_week_rule(
    input: UpsertDayOfWeekRuleInput
  ): Promise<DataResponse<DayOfWeekRule>> {
    const rule = await prisma.dayOfWeekRule.upsert({
      where: { id: input.id ?? Guid.raw() },
      update: {
        dayOfWeek: input.dayOfWeek,
        scheduleDayId: input.scheduleDayId,
        ruleSetId: input.ruleSetId,
        scheduleId: input.scheduleId,
      },
      create: {
        id: input.id ?? Guid.raw(),
        dayOfWeek: input.dayOfWeek,
        scheduleDayId: input.scheduleDayId,
        ruleSetId: input.ruleSetId,
        scheduleId: input.scheduleId,
      },
    });
    
    /* istanbul ignore if */
    if (!rule) {
      const msg = 'Failed to upsert day of week rule';
      this.log.error(msg);
      return { success: false, message: msg };
    }

    return { success: true, data: rule };
  }

  public async get_day_of_week_rule(id: ID): Promise<DataResponse<DayOfWeekRule>> {
    const rule = await prisma.dayOfWeekRule.findUnique({
      where: { id },
    });
    
    if (!rule) {
      const msg = 'Requested day of week rule not found';
      this.log.error(msg);
      return { success: false, message: msg };
    }
    
    return { success: true, data: rule };
  }

  public async delete_day_of_week_rule(input: DeleteDayOfWeekRuleInput): Promise<StatusResponse> {
    const res = await prisma.dayOfWeekRule.delete({ where: { id: input.id } });
    
    /* istanbul ignore if */
    if (!res) {
      this.log.error(`Failed to delete day of week rule`);
      return { success: false, message: 'Failed to delete day of week rule' };
    }
    
    return { success: true };
  }

  // ============================================================================
  // PATTERN BASED RULE CRUD OPERATIONS
  // ============================================================================

  public async upsert_pattern_based_rule(
    input: UpsertPatternBasedRuleInput
  ): Promise<DataResponse<PatternBasedRule>> {
    const rule = await prisma.patternBasedRule.upsert({
      where: { id: input.id ?? Guid.raw() },
      update: {
        patternPosition: input.patternPosition,
        scheduleDayId: input.scheduleDayId,
        ruleSetId: input.ruleSetId,
        scheduleId: input.scheduleId,
      },
      create: {
        id: input.id ?? Guid.raw(),
        patternPosition: input.patternPosition,
        scheduleDayId: input.scheduleDayId,
        ruleSetId: input.ruleSetId,
        scheduleId: input.scheduleId,
      },
    });
    
    /* istanbul ignore if */
    if (!rule) {
      const msg = 'Failed to upsert pattern based rule';
      this.log.error(msg);
      return { success: false, message: msg };
    }

    return { success: true, data: rule };
  }

  public async get_pattern_based_rule(id: ID): Promise<DataResponse<PatternBasedRule>> {
    const rule = await prisma.patternBasedRule.findUnique({
      where: { id },
    });
    
    if (!rule) {
      const msg = 'Requested pattern based rule not found';
      this.log.error(msg);
      return { success: false, message: msg };
    }
    
    return { success: true, data: rule };
  }

  public async delete_pattern_based_rule(input: DeletePatternBasedRuleInput): Promise<StatusResponse> {
    const res = await prisma.patternBasedRule.delete({ where: { id: input.id } });
    
    /* istanbul ignore if */
    if (!res) {
      this.log.error(`Failed to delete pattern based rule`);
      return { success: false, message: 'Failed to delete pattern based rule' };
    }
    
    return { success: true };
  }

  // ============================================================================
  // EXCEPTION BASED RULE CRUD OPERATIONS
  // ============================================================================

  public async upsert_exception_based_rule(
    input: UpsertExceptionBasedRuleInput
  ): Promise<DataResponse<ExceptionBasedRule>> {
    const rule = await prisma.exceptionBasedRule.upsert({
      where: { id: input.id ?? Guid.raw() },
      update: {
        date: input.date,
        variantId: input.variantId,
        variantRuleSetId: input.variantRuleSetId,
      },
      create: {
        id: input.id ?? Guid.raw(),
        date: input.date,
        variantId: input.variantId,
        variantRuleSetId: input.variantRuleSetId,
      },
    });
    
    /* istanbul ignore if */
    if (!rule) {
      const msg = 'Failed to upsert exception based rule';
      this.log.error(msg);
      return { success: false, message: msg };
    }

    return { success: true, data: rule };
  }

  public async get_exception_based_rule(id: ID): Promise<DataResponse<ExceptionBasedRule>> {
    const rule = await prisma.exceptionBasedRule.findUnique({
      where: { id },
    });
    
    if (!rule) {
      const msg = 'Requested exception based rule not found';
      this.log.error(msg);
      return { success: false, message: msg };
    }
    
    return { success: true, data: rule };
  }

  public async delete_exception_based_rule(input: DeleteExceptionBasedRuleInput): Promise<StatusResponse> {
    const res = await prisma.exceptionBasedRule.delete({ where: { id: input.id } });
    
    /* istanbul ignore if */
    if (!res) {
      this.log.error(`Failed to delete exception based rule`);
      return { success: false, message: 'Failed to delete exception based rule' };
    }
    
    return { success: true };
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
