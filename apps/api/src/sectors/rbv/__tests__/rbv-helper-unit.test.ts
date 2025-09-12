import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Container } from 'inversify'
import { RBVHelper } from '../rbv_helper'
import type { ILogger } from '@hipponot/logger'
import { mockPrisma, mockBellScheduleFactory } from '@tests/setup/database-mock'
import 'reflect-metadata'

const mockLogger: ILogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
}

describe('RBVHelper (Unit Tests with Mocked Database)', () => {
    let container: Container
    let rbvHelper: RBVHelper

    beforeEach(() => {
        container = new Container()
        container.bind<ILogger>('ILogger').toConstantValue(mockLogger)
        container.bind<RBVHelper>(RBVHelper).toSelf()
        rbvHelper = container.get<RBVHelper>(RBVHelper)
    })

    describe('get_schedule', () => {
        it('should return schedule when found in database', async () => {
            const mockSchedule = mockBellScheduleFactory.build({
                id: 'schedule-1',
                name: 'Test Schedule',
                description: 'Test schedule description',
            })

            mockPrisma.bellSchedule.findUnique.mockResolvedValue(mockSchedule)

            const result = await rbvHelper.get_schedule('schedule-1')

            expect(mockPrisma.bellSchedule.findUnique).toHaveBeenCalledWith({
                where: { id: 'schedule-1' },
                include: {
                    days: {
                        include: {
                            variants: true,
                            timeSlots: true,
                            dayOfWeekRules: true,
                            patternBasedRules: true,
                        },
                    },
                    timeSlots: true,
                    recurrenceRuleSet: true,
                },
            })

            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data).toEqual(mockSchedule)
            }
        })

        it('should return error when schedule not found', async () => {
            mockPrisma.bellSchedule.findUnique.mockResolvedValue(null)

            const result = await rbvHelper.get_schedule('non-existent-id')

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.message).toBe('Requested bell schedule not found')
            }
        })

        it('should handle database errors gracefully', async () => {
            const dbError = new Error('Database connection failed')
            mockPrisma.bellSchedule.findUnique.mockRejectedValue(dbError)

            // The actual implementation doesn't have try-catch, so it will throw
            await expect(rbvHelper.get_schedule('schedule-1')).rejects.toThrow(
                'Database connection failed'
            )
        })
    })

    describe('upsert_schedule', () => {
        it('should upsert schedule successfully', async () => {
            const inputData = {
                name: 'New Schedule',
                description: 'New schedule description',
                activeDaysOfWeek: [1, 2, 3, 4, 5],
            }

            const createdSchedule = mockBellScheduleFactory.build({
                id: 'generated-id',
                ...inputData,
            })

            mockPrisma.bellSchedule.upsert.mockResolvedValue(createdSchedule)

            const result = await rbvHelper.upsert_schedule(inputData)

            expect(mockPrisma.bellSchedule.upsert).toHaveBeenCalledWith({
                where: { id: expect.any(String) }, // Generated UUID when no ID provided
                update: inputData,
                create: inputData,
                include: {
                    days: {
                        include: {
                            variants: true,
                            timeSlots: true,
                            dayOfWeekRules: true,
                            patternBasedRules: true,
                        },
                    },
                    timeSlots: true,
                    recurrenceRuleSet: true,
                },
            })

            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data).toEqual(createdSchedule)
            }
        })

        it('should upsert schedule with provided id', async () => {
            const inputData = {
                id: 'custom-id',
                name: 'Custom Schedule',
                description: 'Custom description',
                activeDaysOfWeek: [1, 2, 3],
            }

            const createdSchedule = mockBellScheduleFactory.build(inputData)
            mockPrisma.bellSchedule.upsert.mockResolvedValue(createdSchedule)

            const result = await rbvHelper.upsert_schedule(inputData)

            expect(mockPrisma.bellSchedule.upsert).toHaveBeenCalledWith({
                where: { id: 'custom-id' },
                update: inputData,
                create: inputData,
                include: expect.any(Object),
            })

            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.id).toBe('custom-id')
            }
        })

        it('should return error message when upsert returns null', async () => {
            const inputData = {
                name: 'Test Schedule',
                description: 'Test description',
                activeDaysOfWeek: [1, 2, 3, 4, 5],
            }

            mockPrisma.bellSchedule.upsert.mockResolvedValue(null)

            const result = await rbvHelper.upsert_schedule(inputData)

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.message).toBe('Failed to upsert bell schedule')
            }
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to upsert bell schedule')
        })
    })

    describe('delete_schedule', () => {
        it('should successfully delete existing schedule', async () => {
            const scheduleId = 'schedule-to-delete'
            const deletedSchedule = mockBellScheduleFactory.build({ id: scheduleId })

            mockPrisma.bellSchedule.delete.mockResolvedValue(deletedSchedule)

            const result = await rbvHelper.delete_schedule({ id: scheduleId })

            expect(mockPrisma.bellSchedule.delete).toHaveBeenCalledWith({
                where: { id: scheduleId },
            })

            expect(result.success).toBe(true)
        })

        it('should return error when delete returns null', async () => {
            const scheduleId = 'schedule-to-delete'
            mockPrisma.bellSchedule.delete.mockResolvedValue(null)

            const result = await rbvHelper.delete_schedule({ id: scheduleId })

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.message).toBe('Failed to delete bell schedule')
            }
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to delete bell schedule')
        })
    })

    describe('error handling patterns', () => {
        it('should throw database errors since no try-catch in implementation', async () => {
            const dbError = new Error('Connection timeout')
            mockPrisma.bellSchedule.findUnique.mockRejectedValue(dbError)

            await expect(rbvHelper.get_schedule('test-id')).rejects.toThrow('Connection timeout')
        })

        it('should throw non-Error objects from database', async () => {
            const nonErrorObject = { message: 'String error', code: 'DB_ERROR' }
            mockPrisma.bellSchedule.findUnique.mockRejectedValue(nonErrorObject)

            await expect(rbvHelper.get_schedule('test-id')).rejects.toEqual(nonErrorObject)
        })
    })
})
