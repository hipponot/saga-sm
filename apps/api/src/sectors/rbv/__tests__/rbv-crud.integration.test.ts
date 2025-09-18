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
import { 
  BellSchedule, 
  BellScheduleDay, 
  BellScheduleVariant, 
  DayLabelRuleSet, 
  VariantRuleSet 
} from '../rbv.types'
import { BellScheduleBuilder } from './builders/rbv.builders'
import { prisma, DayLabelRecurrenceRuleType } from '@repo/db'
import type { ILogger } from '@hipponot/soa-logger'
import { faker } from '@faker-js/faker'
import { LocalDate } from '@js-joda/core'

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

  describe('Bell Schedule Day CRUD', () => {
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

    describe('Bell Schedule Day Creation & Update', () => {
      it('creates a bell schedule day without specifying an id', async () => {
        // ARRANGE
        const input = {
          name: 'A Day',
          description: 'First day of rotation',
          scheduleId: schedule.id,
        }

        // ACT
        const res = await rbv_helper.upsert_schedule_day(input)
        if (!res.success) throw new Error(res.message)
        const created_day = res.data

        // ASSERT
        expect(created_day).toEqual(
          expect.objectContaining({
            name: input.name,
            description: input.description,
            scheduleId: input.scheduleId,
          })
        )
        expect(created_day.id).toBeDefined()
      })

      it('creates a bell schedule day with a specified id', async () => {
        // ARRANGE
        const input = {
          id: 'test-day-id',
          name: 'B Day',
          description: 'Second day of rotation',
          scheduleId: schedule.id,
        }

        // ACT
        const res = await rbv_helper.upsert_schedule_day(input)
        if (!res.success) throw new Error(res.message)
        const created_day = res.data

        // ASSERT
        expect(created_day).toEqual(
          expect.objectContaining({
            id: 'test-day-id',
            name: input.name,
            description: input.description,
            scheduleId: input.scheduleId,
          })
        )
      })

      it('updates an existing bell schedule day', async () => {
        // ARRANGE
        const initial_input = {
          id: faker.string.uuid(),
          name: 'Original Day',
          description: 'Original description',
          scheduleId: schedule.id,
        }
        await rbv_helper.upsert_schedule_day(initial_input)

        // ACT
        const res = await rbv_helper.upsert_schedule_day({
          ...initial_input,
          name: 'Updated Day',
          description: 'Updated description',
        })
        if (!res.success) throw new Error(res.message)
        const updated_day = res.data

        // ASSERT
        expect(updated_day.name).toBe('Updated Day')
        expect(updated_day.description).toBe('Updated description')
        expect(updated_day.id).toBe(initial_input.id)
      })
    })

    describe('Bell Schedule Day Retrieval', () => {
      it('retrieves a bell schedule day by id', async () => {
        // ARRANGE
        const input = {
          id: faker.string.uuid(),
          name: 'Test Day',
          description: 'Test description',
          scheduleId: schedule.id,
        }
        await rbv_helper.upsert_schedule_day(input)

        // ACT
        const res = await rbv_helper.get_schedule_day(input.id!)
        if (!res.success) throw new Error(res.message)
        const retrieved_day = res.data

        // ASSERT
        expect(retrieved_day).toEqual(
          expect.objectContaining({
            id: input.id,
            name: input.name,
            description: input.description,
            scheduleId: input.scheduleId,
          })
        )
      })

      it('returns an error if the bell schedule day does not exist', async () => {
        // ACT
        const res = await rbv_helper.get_schedule_day('nonexistent-id')

        // ASSERT
        expect(res.success).toBe(false)
        expect(res.message).toBe('Requested bell schedule day not found')
      })
    })

    describe('Bell Schedule Day Deletion', () => {
      it('deletes a bell schedule day by id', async () => {
        // ARRANGE
        const input = {
          id: faker.string.uuid(),
          name: 'Test Day',
          description: 'Test description',
          scheduleId: schedule.id,
        }
        await rbv_helper.upsert_schedule_day(input)

        // ACT
        const res = await rbv_helper.delete_schedule_day({ id: input.id! })
        if (!res.success) throw new Error(res.message)

        // ASSERT
        const fetched_day = await prisma.bellScheduleDay.findUnique({
          where: { id: input.id },
        })
        expect(fetched_day).toBeNull()
      })
    })
  })

  describe('Day Label Rule Set CRUD', () => {
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

    describe('Day Label Rule Set Creation & Update', () => {
      it('creates a day label rule set without specifying an id', async () => {
        // ARRANGE
        const input = {
          name: 'Weekly Pattern',
          type: DayLabelRecurrenceRuleType.DAY_OF_WEEK,
          description: 'Simple weekly schedule',
          scheduleId: schedule.id,
          seedDate: null,
        }

        // ACT
        const res = await rbv_helper.upsert_day_label_rule_set(input)
        if (!res.success) throw new Error(res.message)
        const created_rule_set = res.data

        // ASSERT
        expect(created_rule_set).toEqual(
          expect.objectContaining({
            name: input.name,
            type: input.type,
            description: input.description,
            scheduleId: input.scheduleId,
          })
        )
        expect(created_rule_set.id).toBeDefined()
      })

      it('creates a pattern-based rule set with seed date', async () => {
        // ARRANGE
        const seedDate = LocalDate.now().toString()
        const input = {
          id: 'test-rule-set-id',
          name: 'AB Pattern',
          type: DayLabelRecurrenceRuleType.PATTERN_BASED,
          description: 'AB rotation pattern',
          scheduleId: schedule.id,
          seedDate: seedDate,
        }

        // ACT
        const res = await rbv_helper.upsert_day_label_rule_set(input)
        if (!res.success) throw new Error(res.message)
        const created_rule_set = res.data

        // ASSERT
        expect(created_rule_set).toEqual(
          expect.objectContaining({
            id: 'test-rule-set-id',
            name: input.name,
            type: input.type,
            seedDate: seedDate,
            scheduleId: input.scheduleId,
          })
        )
      })

      it('updates an existing day label rule set', async () => {
        // ARRANGE
        const initial_input = {
          id: faker.string.uuid(),
          name: 'Original Rule Set',
          type: DayLabelRecurrenceRuleType.DAY_OF_WEEK,
          description: 'Original description',
          scheduleId: schedule.id,
          seedDate: null,
        }
        await rbv_helper.upsert_day_label_rule_set(initial_input)

        // ACT
        const res = await rbv_helper.upsert_day_label_rule_set({
          ...initial_input,
          name: 'Updated Rule Set',
          description: 'Updated description',
        })
        if (!res.success) throw new Error(res.message)
        const updated_rule_set = res.data

        // ASSERT
        expect(updated_rule_set.name).toBe('Updated Rule Set')
        expect(updated_rule_set.description).toBe('Updated description')
        expect(updated_rule_set.id).toBe(initial_input.id)
      })
    })

    describe('Day Label Rule Set Retrieval', () => {
      it('retrieves a day label rule set by id', async () => {
        // ARRANGE
        const input = {
          id: faker.string.uuid(),
          name: 'Test Rule Set',
          type: DayLabelRecurrenceRuleType.DAY_OF_WEEK,
          description: 'Test description',
          scheduleId: schedule.id,
          seedDate: null,
        }
        await rbv_helper.upsert_day_label_rule_set(input)

        // ACT
        const res = await rbv_helper.get_day_label_rule_set(input.id!)
        if (!res.success) throw new Error(res.message)
        const retrieved_rule_set = res.data

        // ASSERT
        expect(retrieved_rule_set).toEqual(
          expect.objectContaining({
            id: input.id,
            name: input.name,
            type: input.type,
            description: input.description,
            scheduleId: input.scheduleId,
          })
        )
      })

      it('returns an error if the day label rule set does not exist', async () => {
        // ACT
        const res = await rbv_helper.get_day_label_rule_set('nonexistent-id')

        // ASSERT
        expect(res.success).toBe(false)
        expect(res.message).toBe('Requested day label rule set not found')
      })
    })

    describe('Day Label Rule Set Deletion', () => {
      it('deletes a day label rule set by id', async () => {
        // ARRANGE
        const input = {
          id: faker.string.uuid(),
          name: 'Test Rule Set',
          type: DayLabelRecurrenceRuleType.DAY_OF_WEEK,
          description: 'Test description',
          scheduleId: schedule.id,
          seedDate: null,
        }
        await rbv_helper.upsert_day_label_rule_set(input)

        // ACT
        const res = await rbv_helper.delete_day_label_rule_set({ id: input.id! })
        if (!res.success) throw new Error(res.message)

        // ASSERT
        const fetched_rule_set = await prisma.dayLabelRuleSet.findUnique({
          where: { id: input.id },
        })
        expect(fetched_rule_set).toBeNull()
      })
    })
  })

  describe('Variant Rule Set CRUD', () => {
    let schedule: BellSchedule
    let variant: BellScheduleVariant

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

      // Create a variant to use as default
      const variant_input = {
        id: faker.string.uuid(),
        name: 'Default Variant',
        description: 'Default variant for testing',
        scheduleId: schedule.id,
      }
      const variant_res = await rbv_helper.upsert_variant(variant_input)
      if (!variant_res.success) throw new Error(variant_res.message)
      variant = variant_res.data
    })

    describe('Variant Rule Set Creation & Update', () => {
      it('creates a variant rule set without specifying an id', async () => {
        // ARRANGE
        const input = {
          name: 'Default Rule Set',
          description: 'Default variant rule set',
          defaultVariantId: variant.id,
          scheduleId: schedule.id,
        }

        // ACT
        const res = await rbv_helper.upsert_variant_rule_set(input)
        if (!res.success) throw new Error(res.message)
        const created_rule_set = res.data

        // ASSERT
        expect(created_rule_set).toEqual(
          expect.objectContaining({
            name: input.name,
            description: input.description,
            defaultVariantId: input.defaultVariantId,
            scheduleId: input.scheduleId,
          })
        )
        expect(created_rule_set.id).toBeDefined()
      })

      it('creates a variant rule set with a specified id', async () => {
        // ARRANGE
        const input = {
          id: 'test-variant-rule-set-id',
          name: 'Test Rule Set',
          description: 'Test variant rule set',
          defaultVariantId: variant.id,
          scheduleId: schedule.id,
        }

        // ACT
        const res = await rbv_helper.upsert_variant_rule_set(input)
        if (!res.success) throw new Error(res.message)
        const created_rule_set = res.data

        // ASSERT
        expect(created_rule_set).toEqual(
          expect.objectContaining({
            id: 'test-variant-rule-set-id',
            name: input.name,
            description: input.description,
            defaultVariantId: input.defaultVariantId,
            scheduleId: input.scheduleId,
          })
        )
      })

      it('updates an existing variant rule set', async () => {
        // ARRANGE
        const initial_input = {
          id: faker.string.uuid(),
          name: 'Original Rule Set',
          description: 'Original description',
          defaultVariantId: variant.id,
          scheduleId: schedule.id,
        }
        await rbv_helper.upsert_variant_rule_set(initial_input)

        // ACT
        const res = await rbv_helper.upsert_variant_rule_set({
          ...initial_input,
          name: 'Updated Rule Set',
          description: 'Updated description',
        })
        if (!res.success) throw new Error(res.message)
        const updated_rule_set = res.data

        // ASSERT
        expect(updated_rule_set.name).toBe('Updated Rule Set')
        expect(updated_rule_set.description).toBe('Updated description')
        expect(updated_rule_set.id).toBe(initial_input.id)
      })
    })

    describe('Variant Rule Set Retrieval', () => {
      it('retrieves a variant rule set by id', async () => {
        // ARRANGE
        const input = {
          id: faker.string.uuid(),
          name: 'Test Rule Set',
          description: 'Test description',
          defaultVariantId: variant.id,
          scheduleId: schedule.id,
        }
        await rbv_helper.upsert_variant_rule_set(input)

        // ACT
        const res = await rbv_helper.get_variant_rule_set(input.id!)
        if (!res.success) throw new Error(res.message)
        const retrieved_rule_set = res.data

        // ASSERT
        expect(retrieved_rule_set).toEqual(
          expect.objectContaining({
            id: input.id,
            name: input.name,
            description: input.description,
            defaultVariantId: input.defaultVariantId,
            scheduleId: input.scheduleId,
          })
        )
      })

      it('returns an error if the variant rule set does not exist', async () => {
        // ACT
        const res = await rbv_helper.get_variant_rule_set('nonexistent-id')

        // ASSERT
        expect(res.success).toBe(false)
        expect(res.message).toBe('Requested variant rule set not found')
      })
    })

    describe('Variant Rule Set Deletion', () => {
      it('deletes a variant rule set by id', async () => {
        // ARRANGE
        const input = {
          id: faker.string.uuid(),
          name: 'Test Rule Set',
          description: 'Test description',
          defaultVariantId: variant.id,
          scheduleId: schedule.id,
        }
        await rbv_helper.upsert_variant_rule_set(input)

        // ACT
        const res = await rbv_helper.delete_variant_rule_set({ id: input.id! })
        if (!res.success) throw new Error(res.message)

        // ASSERT
        const fetched_rule_set = await prisma.variantRuleSet.findUnique({
          where: { id: input.id },
        })
        expect(fetched_rule_set).toBeNull()
      })
    })
  })

  describe('Time Slot CRUD', () => {
    let variant: BellScheduleVariant

    beforeEach(async () => {
      const schedule_input = UpsertBellScheduleInputFactory.build({ id: faker.string.uuid() })
      await prisma.bellSchedule.create({ data: schedule_input })

      // Create a variant to associate time slots with
      const variant_input = {
        id: faker.string.uuid(),
        name: 'Test Variant',
        description: 'Variant for time slot testing',
        scheduleId: schedule_input.id!,
      }
      const variant_res = await rbv_helper.upsert_variant(variant_input)
      if (!variant_res.success) throw new Error(variant_res.message)
      variant = variant_res.data
    })

    describe('Time Slot Creation & Update', () => {
      it('creates a time slot without specifying an id', async () => {
        // ARRANGE
        const input = {
          name: 'Period 1',
          start: '08:00',
          end: '09:30',
          variantId: variant.id,
        }

        // ACT
        const res = await rbv_helper.upsert_time_slot(input)
        if (!res.success) throw new Error(res.message)
        const created_time_slot = res.data

        // ASSERT
        expect(created_time_slot).toEqual(
          expect.objectContaining({
            name: input.name,
            start: input.start,
            end: input.end,
            variantId: input.variantId,
          })
        )
        expect(created_time_slot.id).toBeDefined()
      })

      it('creates a time slot with a specified id', async () => {
        // ARRANGE
        const input = {
          id: 'test-time-slot-id',
          name: 'Period 2',
          start: '09:35',
          end: '11:05',
          variantId: variant.id,
        }

        // ACT
        const res = await rbv_helper.upsert_time_slot(input)
        if (!res.success) throw new Error(res.message)
        const created_time_slot = res.data

        // ASSERT
        expect(created_time_slot).toEqual(
          expect.objectContaining({
            id: 'test-time-slot-id',
            name: input.name,
            start: input.start,
            end: input.end,
            variantId: input.variantId,
          })
        )
      })

      it('updates an existing time slot', async () => {
        // ARRANGE
        const initial_input = {
          id: faker.string.uuid(),
          name: 'Original Period',
          start: '08:00',
          end: '09:00',
          variantId: variant.id,
        }
        await rbv_helper.upsert_time_slot(initial_input)

        // ACT
        const res = await rbv_helper.upsert_time_slot({
          ...initial_input,
          name: 'Updated Period',
          start: '08:30',
          end: '09:30',
        })
        if (!res.success) throw new Error(res.message)
        const updated_time_slot = res.data

        // ASSERT
        expect(updated_time_slot.name).toBe('Updated Period')
        expect(updated_time_slot.start).toBe('08:30')
        expect(updated_time_slot.end).toBe('09:30')
        expect(updated_time_slot.id).toBe(initial_input.id)
      })
    })

    describe('Time Slot Retrieval', () => {
      it('retrieves a time slot by id', async () => {
        // ARRANGE
        const input = {
          id: faker.string.uuid(),
          name: 'Test Period',
          start: '10:00',
          end: '11:30',
          variantId: variant.id,
        }
        await rbv_helper.upsert_time_slot(input)

        // ACT
        const res = await rbv_helper.get_time_slot(input.id!)
        if (!res.success) throw new Error(res.message)
        const retrieved_time_slot = res.data

        // ASSERT
        expect(retrieved_time_slot).toEqual(
          expect.objectContaining({
            id: input.id,
            name: input.name,
            start: input.start,
            end: input.end,
            variantId: input.variantId,
          })
        )
      })

      it('returns an error if the time slot does not exist', async () => {
        // ACT
        const res = await rbv_helper.get_time_slot('nonexistent-id')

        // ASSERT
        expect(res.success).toBe(false)
        expect(res.message).toBe('Requested time slot not found')
      })
    })

    describe('Time Slot Deletion', () => {
      it('deletes a time slot by id', async () => {
        // ARRANGE
        const input = {
          id: faker.string.uuid(),
          name: 'Test Period',
          start: '10:00',
          end: '11:30',
          variantId: variant.id,
        }
        await rbv_helper.upsert_time_slot(input)

        // ACT
        const res = await rbv_helper.delete_time_slot({ id: input.id! })
        if (!res.success) throw new Error(res.message)

        // ASSERT
        const fetched_time_slot = await prisma.timeSlot.findUnique({
          where: { id: input.id },
        })
        expect(fetched_time_slot).toBeNull()
      })
    })
  })

  describe('Rule CRUD Operations', () => {
    let schedule: BellSchedule
    let scheduleDay: BellScheduleDay
    let dayLabelRuleSet: DayLabelRuleSet
    let variant: BellScheduleVariant
    let variantRuleSet: VariantRuleSet

    beforeEach(async () => {
      // Create base schedule using the helper
      const schedule_input = UpsertBellScheduleInputFactory.build({ id: faker.string.uuid() })
      const schedule_res = await rbv_helper.upsert_schedule(schedule_input)
      if (!schedule_res.success) throw new Error(schedule_res.message)

      schedule = {
        ...schedule_res.data,
        days: [],
        variants: [],
        groups: [],
        dayLabelRuleSet: null,
        variantRuleSet: null,
      }

      // Create schedule day
      const day_input = {
        id: faker.string.uuid(),
        name: 'Test Day',
        description: 'Test day for rules',
        scheduleId: schedule.id,
      }
      const day_res = await rbv_helper.upsert_schedule_day(day_input)
      if (!day_res.success) throw new Error(day_res.message)
      scheduleDay = day_res.data

      // Create day label rule set
      const day_rule_set_input = {
        id: faker.string.uuid(),
        name: 'Test Day Rule Set',
        type: DayLabelRecurrenceRuleType.DAY_OF_WEEK,
        description: 'Test rule set',
        scheduleId: schedule.id,
        seedDate: null,
      }
      const day_rule_set_res = await rbv_helper.upsert_day_label_rule_set(day_rule_set_input)
      if (!day_rule_set_res.success) throw new Error(day_rule_set_res.message)
      dayLabelRuleSet = day_rule_set_res.data

      // Create variant
      const variant_input = {
        id: faker.string.uuid(),
        name: 'Test Variant',
        description: 'Test variant for rules',
        scheduleId: schedule.id,
      }
      const variant_res = await rbv_helper.upsert_variant(variant_input)
      if (!variant_res.success) throw new Error(variant_res.message)
      variant = variant_res.data

      // Create variant rule set
      const variant_rule_set_input = {
        id: faker.string.uuid(),
        name: 'Test Variant Rule Set',
        description: 'Test variant rule set',
        defaultVariantId: variant.id,
        scheduleId: schedule.id,
      }
      const variant_rule_set_res = await rbv_helper.upsert_variant_rule_set(variant_rule_set_input)
      if (!variant_rule_set_res.success) throw new Error(variant_rule_set_res.message)
      variantRuleSet = variant_rule_set_res.data
    })

    describe('Day Of Week Rule CRUD', () => {
      it('creates, retrieves, and deletes a day of week rule', async () => {
        // CREATE
        const input = {
          dayOfWeek: 1, // Monday
          scheduleDayId: scheduleDay.id,
          ruleSetId: dayLabelRuleSet.id,
          scheduleId: schedule.id,
        }

        const create_res = await rbv_helper.upsert_day_of_week_rule(input)
        if (!create_res.success) throw new Error(create_res.message)
        const created_rule = create_res.data

        expect(created_rule).toEqual(
          expect.objectContaining({
            dayOfWeek: input.dayOfWeek,
            scheduleDayId: input.scheduleDayId,
            ruleSetId: input.ruleSetId,
            scheduleId: input.scheduleId,
          })
        )
        expect(created_rule.id).toBeDefined()

        // RETRIEVE
        const get_res = await rbv_helper.get_day_of_week_rule(created_rule.id)
        if (!get_res.success) throw new Error(get_res.message)
        const retrieved_rule = get_res.data

        expect(retrieved_rule).toEqual(created_rule)

        // DELETE
        const delete_res = await rbv_helper.delete_day_of_week_rule({ id: created_rule.id })
        if (!delete_res.success) throw new Error(delete_res.message)

        const fetched_rule = await prisma.dayOfWeekRule.findUnique({
          where: { id: created_rule.id },
        })
        expect(fetched_rule).toBeNull()
      })

      it('updates an existing day of week rule', async () => {
        // ARRANGE
        const initial_input = {
          id: faker.string.uuid(),
          dayOfWeek: 1, // Monday
          scheduleDayId: scheduleDay.id,
          ruleSetId: dayLabelRuleSet.id,
          scheduleId: schedule.id,
        }
        await rbv_helper.upsert_day_of_week_rule(initial_input)

        // ACT
        const res = await rbv_helper.upsert_day_of_week_rule({
          ...initial_input,
          dayOfWeek: 2, // Tuesday
        })
        if (!res.success) throw new Error(res.message)
        const updated_rule = res.data

        // ASSERT
        expect(updated_rule.dayOfWeek).toBe(2)
        expect(updated_rule.id).toBe(initial_input.id)
      })
    })

    describe('Pattern Based Rule CRUD', () => {
      beforeEach(async () => {
        // Update rule set to pattern-based
        await rbv_helper.upsert_day_label_rule_set({
          id: dayLabelRuleSet.id,
          name: dayLabelRuleSet.name,
          type: DayLabelRecurrenceRuleType.PATTERN_BASED,
          description: dayLabelRuleSet.description,
          scheduleId: schedule.id,
          seedDate: LocalDate.now().toString(),
        })
      })

      it('creates, retrieves, and deletes a pattern based rule', async () => {
        // CREATE
        const input = {
          patternPosition: 0,
          scheduleDayId: scheduleDay.id,
          ruleSetId: dayLabelRuleSet.id,
          scheduleId: schedule.id,
        }

        const create_res = await rbv_helper.upsert_pattern_based_rule(input)
        if (!create_res.success) throw new Error(create_res.message)
        const created_rule = create_res.data

        expect(created_rule).toEqual(
          expect.objectContaining({
            patternPosition: input.patternPosition,
            scheduleDayId: input.scheduleDayId,
            ruleSetId: input.ruleSetId,
            scheduleId: input.scheduleId,
          })
        )
        expect(created_rule.id).toBeDefined()

        // RETRIEVE
        const get_res = await rbv_helper.get_pattern_based_rule(created_rule.id)
        if (!get_res.success) throw new Error(get_res.message)
        const retrieved_rule = get_res.data

        expect(retrieved_rule).toEqual(created_rule)

        // DELETE
        const delete_res = await rbv_helper.delete_pattern_based_rule({ id: created_rule.id })
        if (!delete_res.success) throw new Error(delete_res.message)

        const fetched_rule = await prisma.patternBasedRule.findUnique({
          where: { id: created_rule.id },
        })
        expect(fetched_rule).toBeNull()
      })

      it('updates an existing pattern based rule', async () => {
        // ARRANGE
        const initial_input = {
          id: faker.string.uuid(),
          patternPosition: 0,
          scheduleDayId: scheduleDay.id,
          ruleSetId: dayLabelRuleSet.id,
          scheduleId: schedule.id,
        }
        await rbv_helper.upsert_pattern_based_rule(initial_input)

        // ACT
        const res = await rbv_helper.upsert_pattern_based_rule({
          ...initial_input,
          patternPosition: 1,
        })
        if (!res.success) throw new Error(res.message)
        const updated_rule = res.data

        // ASSERT
        expect(updated_rule.patternPosition).toBe(1)
        expect(updated_rule.id).toBe(initial_input.id)
      })
    })

    describe('Exception Based Rule CRUD', () => {
      it('creates, retrieves, and deletes an exception based rule', async () => {
        // CREATE
        const input = {
          date: LocalDate.now().plusDays(1).toString(),
          variantId: variant.id,
          variantRuleSetId: variantRuleSet.id,
        }

        const create_res = await rbv_helper.upsert_exception_based_rule(input)
        if (!create_res.success) throw new Error(create_res.message)
        const created_rule = create_res.data

        expect(created_rule).toEqual(
          expect.objectContaining({
            date: input.date,
            variantId: input.variantId,
            variantRuleSetId: input.variantRuleSetId,
          })
        )
        expect(created_rule.id).toBeDefined()

        // RETRIEVE
        const get_res = await rbv_helper.get_exception_based_rule(created_rule.id)
        if (!get_res.success) throw new Error(get_res.message)
        const retrieved_rule = get_res.data

        expect(retrieved_rule).toEqual(created_rule)

        // DELETE
        const delete_res = await rbv_helper.delete_exception_based_rule({ id: created_rule.id })
        if (!delete_res.success) throw new Error(delete_res.message)

        const fetched_rule = await prisma.exceptionBasedRule.findUnique({
          where: { id: created_rule.id },
        })
        expect(fetched_rule).toBeNull()
      })

      it('updates an existing exception based rule', async () => {
        // ARRANGE
        const initial_input = {
          id: faker.string.uuid(),
          date: LocalDate.now().plusDays(1).toString(),
          variantId: variant.id,
          variantRuleSetId: variantRuleSet.id,
        }
        await rbv_helper.upsert_exception_based_rule(initial_input)

        // ACT
        const new_date = LocalDate.now().plusDays(2).toString()
        const res = await rbv_helper.upsert_exception_based_rule({
          ...initial_input,
          date: new_date,
        })
        if (!res.success) throw new Error(res.message)
        const updated_rule = res.data

        // ASSERT
        expect(updated_rule.date).toBe(new_date)
        expect(updated_rule.id).toBe(initial_input.id)
      })
    })
  })
})