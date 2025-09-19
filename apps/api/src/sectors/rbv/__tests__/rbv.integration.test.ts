import { faker } from '@faker-js/faker';
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from 'vitest'
import {
  BellScheduleDayFactory,
  BellScheduleGroupFactory,
  BellScheduleVariantFactory,
  DayLabelRuleSetFactory,
  TimeSlotFactory,
  PatternBasedRuleFactory,
  VariantRuleSetFactory,
  ExceptionBasedRuleFactory,
  BellScheduleFactory,
} from './builders/rbv.factories';
import { LocalDate } from '@js-joda/core';
import { BellScheduleBuilder } from './builders/rbv.builders';
import { DayLabelRecurrenceRuleType, prisma } from '@repo/db';
import { RBVHelper } from '../rbv_helper';
import { Container } from 'inversify';
import { ILogger } from '@hipponot/soa-logger';
import { BellSchedule } from '../rbv.types';

const mockLogger: ILogger = {
  info: console.log,
  warn: console.log,
  error: console.log,
  debug: console.log,
}

describe('RBVHelper', () => {
  let container: Container
  let rbv_helper: RBVHelper

  beforeEach(async () => {
    container = new Container()
    container.bind('ILogger').toConstantValue(mockLogger)
    container.bind<RBVHelper>('RBVHelper').to(RBVHelper)
    rbv_helper = container.get('RBVHelper')
  })

  describe('Bladensburg Example', () => {
    let schedule: BellSchedule;
    beforeEach(async () => {
      await prisma.bellSchedule.deleteMany();

      schedule = await create_bladensburg_schedule(rbv_helper);
    })

    it('request for the next week of meeting times gives alternating A and B days', async () => {
      // ARRANGE

      // ACT
      const meetingTimeRes = await rbv_helper.calculate_meeting_times({
        scheduleId: schedule.id,
        dateRange: {
          start: LocalDate.now(),
          end: LocalDate.now().plusDays(7),
        },
      });
      if (!meetingTimeRes.success) {
        throw new Error('Failed to calculate meeting times');
      }

      // Determine which groups meet on each day
      const meetingTimeMap = new Map<string, string[]>(); // date -> groups that meet on that date
      for (const groupMeetings of meetingTimeRes.data) {
        for (const meeting of groupMeetings.meetingTimes) {
          const date = meeting.start.toLocalDate();
          if (!meetingTimeMap.get(date.toString())) {
            meetingTimeMap.set(date.toString(), []);
          }
          meetingTimeMap.get(date.toString())!.push(groupMeetings.scheduleGroupId);
        }
      }

      // Split the groups into the A day and B day groups
      const a_day_groups = schedule.days.find(day => day.name === 'A Day')?.groups.map(group => group.id) ?? [];
      const b_day_groups = schedule.days.find(day => day.name === 'B Day')?.groups.map(group => group.id) ?? [];
      expect(a_day_groups.length).toBe(4);
      expect(b_day_groups.length).toBe(4);

      // ASSERT
      let index = 0;
      for (const date of Array.from(meetingTimeMap.keys()).sort()) {
        const groups = meetingTimeMap.get(date)!;
        if (index % 2 === 0) {
          expect(groups.sort()).toEqual(a_day_groups.sort());
        } else {
          expect(groups.sort()).toEqual(b_day_groups.sort());
        }
        index++;
      }
    })
  })
})

async function create_bladensburg_schedule(rbv_helper: RBVHelper) {
  const schedule_id = faker.string.uuid()

  // Add the groupings for the A and B days
  const groupings = ["1A", "2A", "3A", "4A", "1B", "2B", "3B", "4B"].map(name => {
    return BellScheduleGroupFactory.build({
      name: name,
      scheduleId: schedule_id,
    })
  });

  // Add the A and B days specifying the groupings they define
  const ADay = BellScheduleDayFactory.build({
    name: 'A Day',
    scheduleId: schedule_id,
    groups: groupings.slice(0, 4),
  })
  const BDay = BellScheduleDayFactory.build({
    name: 'B Day',
    scheduleId: schedule_id,
    groups: groupings.slice(4, 8),
  })

  // Add the normal and two-hour delay variants
  const variantNormal = BellScheduleVariantFactory.build({
    name: 'Normal',
    scheduleId: schedule_id,
    timeSlots: [],
  })
  variantNormal.timeSlots= [
    {start: '09:30', end: '10:48'},
    {start: '10:55', end: '13:20'},
    {start: '13:27', end: '14:45'},
    {start: '14:52', end: '16:10'},
  ].map((slot, index) => {
    return TimeSlotFactory.build({
      name: `Normal ${index}`,
      variantId: variantNormal.id,
      start: slot.start,
      end: slot.end,
    })
  })

  const variantTwoHrDelay = BellScheduleVariantFactory.build({
    name: 'Two Hour Delay',
    scheduleId: schedule_id,
    timeSlots: [],
  })
  variantTwoHrDelay.timeSlots = [
    {start: '13:59', end: '14:36'},
    {start: '11:30', end: '13:52'},
    {start: '14:43', end: '15:23'},
    {start: '15:29', end: '16:10'},
  ].map((slot, index) => {
    return TimeSlotFactory.build({
      name: `Two Hour Delay ${index}`,
      variantId: variantTwoHrDelay.id,
      start: slot.start,
      end: slot.end,
    })
  })

  // Add the A/B pattern for the day rules
  const dayRuleSet = DayLabelRuleSetFactory.build({
    scheduleId: schedule_id,
    type: DayLabelRecurrenceRuleType.PATTERN_BASED,
    dayOfWeekRules: undefined,
  })
  dayRuleSet.patternBasedRules = [
    PatternBasedRuleFactory.build({
      scheduleId: schedule_id,
      scheduleDayId: ADay.id,
      ruleSetId: dayRuleSet.id,
      patternPosition: 0,
    }),
    PatternBasedRuleFactory.build({
      scheduleId: schedule_id,
      scheduleDayId: BDay.id,
      ruleSetId: dayRuleSet.id,
      patternPosition: 1,
    }),
  ]

  // Mark the normal variant as default with an exception for the two-hour delay variant
  const variantRuleSet = VariantRuleSetFactory.build({
    scheduleId: schedule_id,
    defaultVariantId: variantNormal.id,
    exceptions: [],
  })
  variantRuleSet.exceptions = [
    ExceptionBasedRuleFactory.build({
      variantId: variantTwoHrDelay.id,
      variantRuleSetId: variantRuleSet.id,
      date: LocalDate.now().plusDays((7 - LocalDate.now().dayOfWeek().value() + 2) % 7 || 7).toString(), // Next Tuesday
    }),
  ]

  const schedule = BellScheduleFactory.build({
    id: schedule_id,
    name: 'Bladensburg',
    description: 'Bladensburg schedule',
    days: [ADay, BDay],
    variants: [variantNormal, variantTwoHrDelay],
    groups: groupings,
    dayLabelRuleSet: dayRuleSet,
    variantRuleSet: variantRuleSet,
  })

  const builder = new BellScheduleBuilder(rbv_helper, schedule, prisma);
  await builder.build();

  return schedule;
}