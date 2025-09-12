/* eslint-disable @typescript-eslint/naming-convention */
import { Factory } from 'fishery'
import { UpsertBellScheduleVariantInput, UpsertBellScheduleInput } from '../../rbv.types'
import { faker } from '@faker-js/faker'

export const UpsertBellScheduleInputFactory = Factory.define<UpsertBellScheduleInput>(() => ({
    id: Math.random() > 0.5 ? faker.string.uuid() : undefined,
    name: faker.lorem.word(),
    description: faker.lorem.sentence(),
    activeDaysOfWeek: [1, 2, 3, 4, 5],
}))

export const UpsertBellScheduleVariantInputFactory = Factory.define<UpsertBellScheduleVariantInput>(
    () => ({
        id: Math.random() > 0.5 ? faker.string.uuid() : undefined,
        name: faker.lorem.word(),
        description: faker.lorem.sentence(),
        isDefault: faker.datatype.boolean(),
        recurrenceRuleSet: faker.string.uuid(), // ToDo - real RRULE
        scheduleDayId: faker.string.uuid(),
    })
)
