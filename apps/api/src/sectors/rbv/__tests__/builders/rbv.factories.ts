/* eslint-disable @typescript-eslint/naming-convention */
import { Factory } from 'fishery';
import {
  BellSchedule,
  DayLabelRuleSet,
  BellScheduleDay,
  BellScheduleVariant,
  VariantRuleSet,
} from '../../rbv.types';
import { faker } from '@faker-js/faker';
import { DayOfWeekRule, DayLabelRecurrenceRuleType, TimeSlot, BellScheduleGroup, PatternBasedRule, ExceptionBasedRule } from '@repo/db';
import { LocalDate, LocalTime } from '@js-joda/core';
import { LocalTimeRangeFactory } from '../../../../__tests__/util.factories';

export const BellScheduleFactory = Factory.define<BellSchedule>(({ params }) => {
  const id = params.id ?? faker.string.uuid();
  const days = BellScheduleDayFactory.buildList(5, { scheduleId: id });
  return {
    name: faker.lorem.word(),
    id,
    description: faker.lorem.sentence(),
    activeDaysOfWeek: [1, 2, 3, 4, 5],
    days,
    variants: [],
    groups: [],
    dayLabelRuleSet: null,
    variantRuleSet: null,
  };
});

export const BellScheduleVariantFactory = Factory.define<BellScheduleVariant>(() => ({
  id: faker.string.uuid(),
  name: faker.lorem.word(),
  description: faker.lorem.sentence(),
  scheduleId: faker.string.uuid(),
  timeSlots: [],
}));

export const BellScheduleGroupFactory = Factory.define<BellScheduleGroup>(() => ({
  id: faker.string.uuid(),
  name: faker.lorem.word(),
  description: faker.lorem.sentence(),
  scheduleId: faker.string.uuid(),
}));

export const TimeSlotFactory = Factory.define<TimeSlot>(() => {
  const { start, end } = LocalTimeRangeFactory.build();
  return {
    name: faker.lorem.word(),
    id: faker.string.uuid(),
    variantId: faker.string.uuid(),
    start: start.toString(),
    end: end.toString(),
  };
});

export const BellScheduleDayFactory = Factory.define<BellScheduleDay>(() => ({
  id: faker.string.uuid(),
  scheduleId: faker.string.uuid(),
  name: faker.lorem.word(),
  description: faker.lorem.sentence(),
  groups: [],
}));

export const DayLabelRuleSetFactory = Factory.define<DayLabelRuleSet>(() => ({
  id: faker.string.uuid(),
  name: faker.lorem.word(),
  description: faker.lorem.sentence(),
  scheduleId: faker.string.uuid(),
  type: DayLabelRecurrenceRuleType.DAY_OF_WEEK,
  dayOfWeekRules: [],
  patternBasedRules: [],
  seedDate: LocalDate.now().toString(),
}));

export const PatternBasedRuleFactory = Factory.define<PatternBasedRule>(({sequence }) => ({
  id: faker.string.uuid(),
  scheduleId: faker.string.uuid(),
  scheduleDayId: faker.string.uuid(),
  ruleSetId: faker.string.uuid(),
  patternPosition: sequence,
}));

export const DayOfWeekRuleFactory = Factory.define<DayOfWeekRule>(() => ({
  id: faker.string.uuid(),
  scheduleId: faker.string.uuid(),
  dayOfWeek: faker.number.int({ min: 0, max: 6 }),
  scheduleDayId: faker.string.uuid(),
  ruleSetId: faker.string.uuid(),
}));

export const VariantRuleSetFactory = Factory.define<VariantRuleSet>(() => ({
  name: faker.lorem.word(),
  id: faker.string.uuid(),
  description: faker.lorem.sentence(),
  scheduleId: faker.string.uuid(),

  defaultVariantId: faker.string.uuid(),

  exceptions: [],
}));

export const ExceptionBasedRuleFactory = Factory.define<ExceptionBasedRule>(() => ({
  id: faker.string.uuid(),
  variantId: faker.string.uuid(),
  variantRuleSetId: faker.string.uuid(),
  date: LocalDate.now().plusDays(1).toString(),
}));

