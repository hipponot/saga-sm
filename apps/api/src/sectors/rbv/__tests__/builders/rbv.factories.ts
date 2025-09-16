/* eslint-disable @typescript-eslint/naming-convention */
import { Factory } from 'fishery'
import {
    UpsertBellScheduleVariantInput,
    UpsertBellScheduleInput,
    BellSchedule,
    DayRecurrenceRuleSet,
    BellScheduleDay,
    TimeSlot,
} from '../../rbv.types'
import { faker } from '@faker-js/faker'
import { DayOfWeekRule, RecurrenceRuleType } from '@repo/db'
import { LocalDate, LocalTime } from '@js-joda/core'
import { LocalTimeRangeFactory } from '../../../../__tests__/util.factories'

export const BellScheduleFactory = Factory.define<BellSchedule>(({ params }) => {
    const id = params.id ?? faker.string.uuid();
    const days = BellScheduleDayFactory.buildList(5, { scheduleId: id });
    const timeSlots = TimeSlotFactory.buildList(5, { scheduleId: id });
    return {
        name: faker.lorem.word(),
        id,
        description: faker.lorem.sentence(),
        activeDaysOfWeek: [1, 2, 3, 4, 5],
        days,
        timeSlots,
        recurrenceRuleSet: null,
    }
})

export const TimeSlotFactory = Factory.define<TimeSlot>(() => {
    const { start, end } = LocalTimeRangeFactory.build();
    return {
        name: faker.lorem.word(),
        id: faker.string.uuid(),
        scheduleId: faker.string.uuid(),
        start: start.toString(),
        end: end.toString(),
    }
})

export const BellScheduleDayFactory = Factory.define<BellScheduleDay>(() => ({
    id: faker.string.uuid(),
    scheduleId: faker.string.uuid(),
    name: faker.lorem.word(),
    description: faker.lorem.sentence(),
    variants: [],
    timeSlots: [],
    // Removed rule arrays since they're owned by DayRecurrenceRuleSet now
}))

export const DayRecurrenceRuleSetFactory = Factory.define<DayRecurrenceRuleSet>(() => ({
    id: faker.string.uuid(),
    scheduleId: faker.string.uuid(),
    type: RecurrenceRuleType.DAY_OF_WEEK,
    dayOfWeekRules: [],
    seedDate: LocalDate.now().toString(),
}))

export const DayOfWeekRuleFactory = Factory.define<DayOfWeekRule>(() => ({
    id: faker.string.uuid(),
    dayOfWeek: faker.number.int({ min: 0, max: 6 }),
    scheduleDayId: faker.string.uuid(),
    ruleSetId: faker.string.uuid(),
}))

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
        recurrenceRuleSet: faker.string.uuid(), // ToDo - real RRULE
        scheduleDayId: faker.string.uuid(),
    })
)
