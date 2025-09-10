/* eslint-disable @typescript-eslint/naming-convention */
import { Factory } from 'fishery';
import {
  BellSchedule,
  BellScheduleVariant,
  UpsertBellScheduleVariantInput,
  UpsertBellScheduleInput,
} from '../../rbv.types';
import { faker } from '@faker-js/faker';

export const BellScheduleFactory = Factory.define<BellSchedule>(() => ({
  id: faker.string.uuid(),
  name: faker.lorem.word(),
  description: faker.lorem.sentence(),

  //ToDo - make variants self consistent (only one default at least)
  variants: BellScheduleVariantFactory.buildList(Math.ceil(Math.random() * 3)),
}));

export const UpsertBellScheduleInputFactory = Factory.define<UpsertBellScheduleInput>(() => ({
  id: Math.random() > 0.5 ? faker.string.uuid() : undefined,
  name: faker.lorem.word(),
  description: faker.lorem.sentence(),
}));

export const BellScheduleVariantFactory = Factory.define<BellScheduleVariant>(() => ({
  id: faker.string.uuid(),
  name: faker.lorem.word(),
  description: faker.lorem.sentence(),
  isDefault: faker.datatype.boolean(),
  recurrenceRuleSet: faker.string.uuid(), // ToDo - real RRULE
  scheduleId: faker.string.uuid(),

  periods: [],
}));

export const UpsertBellScheduleVariantInputFactory = Factory.define<UpsertBellScheduleVariantInput>(() => ({
  id: Math.random() > 0.5 ? faker.string.uuid() : undefined,
  name: faker.lorem.word(),
  description: faker.lorem.sentence(),
  isDefault: faker.datatype.boolean(),
  recurrenceRuleSet: faker.string.uuid(), // ToDo - real RRULE
  scheduleId: faker.string.uuid(),
}));