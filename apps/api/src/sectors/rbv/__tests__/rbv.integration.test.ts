// rbv.unit.test.ts
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from 'vitest'
import { Container } from 'inversify'
import { RBVHelper } from '../rbv_helper'
import {
  UpsertBellScheduleInputFactory,
  BellScheduleFactory,
  BellScheduleDayFactory,
  BellScheduleGroupFactory,
  BellScheduleVariantFactory,
  TimeSlotFactory,
  DayLabelRuleSetFactory,
  PatternBasedRuleFactory,
  VariantRuleSetFactory,
  ExceptionBasedRuleFactory,
} from './builders/rbv.factories'
import { BellSchedule } from '../rbv.types'
import { BellScheduleBuilder } from './builders/rbv.builders'
import { prisma } from '@repo/db'
import type { ILogger } from '@hipponot/soa-logger'
import { faker } from '@faker-js/faker'
import { LocalDate } from '@js-joda/core'

const mockLogger: ILogger = {
  info: console.log,
  warn: console.log,
  error: console.log,
  debug: console.log,
}

describe.sequential('RBVHelper', () => {
  let container: Container
  let rbv_helper: RBVHelper

  beforeEach(async () => {
    container = new Container()
    container.bind('ILogger').toConstantValue(mockLogger)
    container.bind<RBVHelper>('RBVHelper').to(RBVHelper)
    rbv_helper = container.get('RBVHelper')

    // Clean up all test data
    await prisma.bellScheduleVariant.deleteMany()
    await prisma.bellSchedule.deleteMany()
    await prisma.dayLabelRuleSet.deleteMany()
    await prisma.dayOfWeekRule.deleteMany()
    await prisma.patternBasedRule.deleteMany()
  })

  afterEach(() => {
    container.unbindAll()
  })

  describe('Bell Schedule CRUD', () => {
    describe('Bell Schedule Retrieval', () => {
      it('retrieves a bell schedule by id', async () => {
        // ARRANGE
        const schedule = UpsertBellScheduleInputFactory.build({ id: faker.string.uuid() })
        await prisma.bellSchedule.create({ data: schedule })

        // ACT
        const res = await rbv_helper.get_schedule(schedule.id!)
        if (!res.success) throw new Error(res.message)
        const retrieved_schedule = res.data

        // ASSERT
        expect(retrieved_schedule).toEqual(
          expect.objectContaining({
            id: schedule.id,
            name: schedule.name,
            description: schedule.description,
          })
        )
      })

      it('returns an error if the bell schedule does not exist', async () => {
        // ARRANGE
        // ACT
        const res = await rbv_helper.get_schedule('nonexistent-id')

        // ASSERT
        expect(res.success).toBe(false)
        expect(res.message).toBe('Requested bell schedule not found')
      })
    })

    describe('Bell Schedule Creation & Update', () => {
      it('creates a bell schedule without specifying an id', async () => {
        // ARRANGE
        const input = UpsertBellScheduleInputFactory.build({
          id: undefined,
        })

        // ACT
        const res = await rbv_helper.upsert_schedule(input)
        if (!res.success) throw new Error(res.message)
        const created_schedule = res.data

        // ASSERT
        expect(created_schedule).toEqual(
          expect.objectContaining({
            name: input.name,
            description: input.description,
          })
        )
        expect(created_schedule.id).toBeDefined()
      })

      it('creates a bell schedule with a specified id', async () => {
        // ARRANGE
        const input = UpsertBellScheduleInputFactory.build({
          id: 'test-schedule-id',
        })

        // ACT
        const res = await rbv_helper.upsert_schedule(input)
        if (!res.success) throw new Error(res.message)
        const created_schedule = res.data

        // ASSERT
        expect(created_schedule).toEqual(
          expect.objectContaining({
            id: 'test-schedule-id',
            name: input.name,
            description: input.description,
          })
        )
      })

      it('Updates an existing bell schedule without modifying the variants', async () => {
        // ARRANGE
        const schedule = UpsertBellScheduleInputFactory.build({ id: faker.string.uuid() })
        await prisma.bellSchedule.create({ data: schedule })

        // ACT
        const res = await rbv_helper.upsert_schedule({
          ...schedule,
          name: 'New Name',
        })
        if (!res.success) throw new Error(res.message)
        const returned_schedule = res.data
        const fetched_schedule = await prisma.bellSchedule.findUnique({
          where: { id: schedule.id },
        })

        // ASSERT
        expect(returned_schedule.name).toBe('New Name')
        expect(returned_schedule.id).toBe(schedule.id)
        expect(fetched_schedule?.name).toBe('New Name')
      })
    })

    describe('Bell Schedule Deletion', () => {
      it('deletes a bell schedule by id', async () => {
        // ARRANGE
        const schedule = UpsertBellScheduleInputFactory.build({ id: faker.string.uuid() })
        await prisma.bellSchedule.create({ data: schedule })

        // ACT
        const res = await rbv_helper.delete_schedule({ id: schedule.id! })
        if (!res.success) throw new Error(res.message)

        // ASSERT
        const fetched_schedule = await prisma.bellSchedule.findUnique({
          where: { id: schedule.id },
        })
        expect(fetched_schedule).toBeNull()
      })
    })
  })

  describe('Bell Schedule Variant CUD', () => {
    let schedule: BellSchedule

    beforeEach(async () => {
      const schedule_input = UpsertBellScheduleInputFactory.build({ id: faker.string.uuid() })
      await prisma.bellSchedule.create({ data: schedule_input })

      schedule = {
        ...schedule_input,
        id: schedule_input.id!,
        days: [],
        variants: [],
        groups: [],
        dayLabelRuleSet: null,
        variantRuleSet: null,
      }
    })

    describe('Bell Schedule Variant Creation', () => {
      it('Adds a new variant to a bell schedule', async () => {
        expect(true).toBe(true)
      })
    })
  })

  describe('Meeting Time Calculations', () => {
    describe('Day-Based Day Rules', () => {
      it('calculates the meeting times for a given date range', async () => {
        // ARRANGE
        const schedule = BellScheduleFactory.build()
        const schedule_day = BellScheduleDayFactory.build()
        expect(true).toBe(true)
      })
    })
  })
})

async function create_bladensburg_schedule() {
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

  const builder = new BellScheduleBuilder(schedule, prisma);
  await builder.build();

  return schedule
}