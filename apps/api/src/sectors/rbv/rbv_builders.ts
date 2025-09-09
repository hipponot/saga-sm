/* eslint-disable @typescript-eslint/naming-convention */
import { Factory } from 'fishery';
import { BellSchedule, BellScheduleVariant, CreateBellScheduleVariantInput, UpsertBellScheduleInput } from '../../sectors/rbv_prototype/rbv.types';
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
  periods: [],
}));

export const CreateBellScheduleVariantInputFactory = Factory.define<CreateBellScheduleVariantInput>(() => {
  const variant: CreateBellScheduleVariantInput = {
    ...BellScheduleVariantFactory.build(),
    schedule_id: faker.string.uuid(),
  };

  if (Math.random() > 0.5) {
    delete variant.id;
  }

  return variant;
});