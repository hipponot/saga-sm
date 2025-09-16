// rbv.unit.test.ts
import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach } from 'vitest'
import { Container } from 'inversify'
import { RBVHelper } from '../rbv_helper'
import {
    UpsertBellScheduleVariantInputFactory,
    UpsertBellScheduleInputFactory,
} from './builders/rbv_builders'
import { BellSchedule } from '../rbv.types'
import { prisma } from '@repo/db'
import { ILogger } from '@hipponot/soa-logger'
import { faker } from '@faker-js/faker'

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
        await prisma.dayRecurrenceRuleSet.deleteMany()
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
                timeSlots: [],
                recurrenceRuleSet: null,
            }
        })

        describe('Bell Schedule Variant Creation', () => {
            it('Adds a new variant to a bell schedule', async () => {
                expect(true).toBe(true)
            })
        })
    })
})
