import { test, describe, expect, beforeEach, afterEach } from 'vitest';
import { BellScheduleBuilder } from './rbv.builders';
import {
  BellScheduleFactory,
  DayLabelRuleSetFactory,
  DayOfWeekRuleFactory,
} from './rbv.factories';
import { prisma } from '@repo/db';
import { DayLabelRecurrenceRuleType } from '@repo/db';

describe('BellScheduleBuilder', () => {
  beforeEach(async () => {
    // Clean up all test data
    await prisma.bellScheduleVariant.deleteMany();
    await prisma.dayOfWeekRule.deleteMany();
    await prisma.patternBasedRule.deleteMany();
    await prisma.dayLabelRuleSet.deleteMany();
    await prisma.timeSlot.deleteMany();
    await prisma.bellScheduleDay.deleteMany();
    await prisma.bellSchedule.deleteMany();
  });

  afterEach(async () => {
    // Clean up after tests
    await prisma.bellScheduleVariant.deleteMany();
    await prisma.dayOfWeekRule.deleteMany();
    await prisma.patternBasedRule.deleteMany();
    await prisma.dayLabelRuleSet.deleteMany();
    await prisma.timeSlot.deleteMany();
    await prisma.bellScheduleDay.deleteMany();
    await prisma.bellSchedule.deleteMany();
  });

  test('builds a simple bell schedule without recurrence rules', async () => {
    // ARRANGE
    const schedule = BellScheduleFactory.build({
      dayLabelRuleSet: null,
      days: [],
    });

    // ACT
    const builder = new BellScheduleBuilder(schedule, prisma);
    const result = await builder.build();

    // ASSERT
    expect(result).toBeDefined();
    expect(result.name).toBe(schedule.name);
    expect(result.description).toBe(schedule.description);
    expect(result.activeDaysOfWeek).toEqual(schedule.activeDaysOfWeek);

    // Verify it was created in the database
    const dbSchedule = await prisma.bellSchedule.findUnique({
      where: { id: result.id },
    });
    expect(dbSchedule).toBeDefined();
    expect(dbSchedule?.name).toBe(schedule.name);
  });

  test('builds a bell schedule with schedule days', async () => {
    // ARRANGE
    const scheduleId = 'test-schedule-id-2';
    const schedule = BellScheduleFactory.build({
      id: scheduleId,
      dayLabelRuleSet: null,
    });

    // ACT
    const builder = new BellScheduleBuilder(schedule, prisma);
    const result = await builder.build();

    // ASSERT
    expect(result).toBeDefined();

    // Verify schedule days were created
    const scheduleDays = await prisma.bellScheduleDay.findMany({
      where: { scheduleId: result.id },
    });
    expect(scheduleDays.length).toBe(schedule.days.length);
  });

  test('builds a bell schedule with day-of-week recurrence rules', async () => {
    // ARRANGE
    const scheduleId = 'test-schedule-id-3';
    const dayId1 = 'day-1-id';
    const dayId2 = 'day-2-id';

    // First create a base schedule to get the structure
    const baseSchedule = BellScheduleFactory.build({
      id: scheduleId,
    });

    const schedule = BellScheduleFactory.build({
      id: scheduleId,
      days: [
        { ...baseSchedule.days[0], id: dayId1 },
        { ...baseSchedule.days[1], id: dayId2 },
      ],
      dayLabelRuleSet: DayLabelRuleSetFactory.build({
        type: DayLabelRecurrenceRuleType.DAY_OF_WEEK,
        dayOfWeekRules: [
          DayOfWeekRuleFactory.build({
            dayOfWeek: 1, // Monday
            scheduleDayId: dayId1,
          }),
          DayOfWeekRuleFactory.build({
            dayOfWeek: 2, // Tuesday
            scheduleDayId: dayId2,
          }),
        ],
        patternBasedRules: [],
      }),
    });

    // ACT
    const builder = new BellScheduleBuilder(schedule, prisma);
    const result = await builder.build();

    // ASSERT
    expect(result).toBeDefined();

    // Verify day label rule set was created
    const ruleSet = await prisma.dayLabelRuleSet.findUnique({
      where: { scheduleId: result.id },
      include: {
        dayOfWeekRules: true,
      },
    });

    expect(ruleSet).toBeDefined();
    expect(ruleSet?.type).toBe(DayLabelRecurrenceRuleType.DAY_OF_WEEK);
    expect(ruleSet?.dayOfWeekRules.length).toBe(2);

    // Verify the rules reference the correct schedule days
    const mondayRule = ruleSet?.dayOfWeekRules.find(rule => rule.dayOfWeek === 1);
    const tuesdayRule = ruleSet?.dayOfWeekRules.find(rule => rule.dayOfWeek === 2);

    expect(mondayRule).toBeDefined();
    expect(tuesdayRule).toBeDefined();

    // Verify the schedule day IDs were properly mapped
    const scheduleDays = await prisma.bellScheduleDay.findMany({
      where: { scheduleId: result.id },
    });

    expect(scheduleDays.length).toBe(2);
    expect([mondayRule?.scheduleDayId, tuesdayRule?.scheduleDayId]).toEqual(
      expect.arrayContaining(scheduleDays.map(day => day.id))
    );
  });
});
