import { vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'

// Mock Prisma client with comprehensive database operations  
export const createMockPrismaClient = () => {
    const mockPrisma = {
        // Connection methods
        $connect: vi.fn().mockResolvedValue(undefined),
        $disconnect: vi.fn().mockResolvedValue(undefined),
        $queryRaw: vi.fn(),
        $executeRaw: vi.fn(),
        $transaction: vi.fn(),

        // Bell Schedule operations
        bellSchedule: {
            findMany: vi.fn().mockResolvedValue([]),
            findUnique: vi.fn().mockResolvedValue(null),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
            update: vi.fn(),
            upsert: vi.fn(),
            delete: vi.fn(),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            count: vi.fn().mockResolvedValue(0),
        },

        // Bell Schedule Day operations
        bellScheduleDay: {
            findMany: vi.fn().mockResolvedValue([]),
            findUnique: vi.fn().mockResolvedValue(null),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
            update: vi.fn(),
            upsert: vi.fn(),
            delete: vi.fn(),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            count: vi.fn().mockResolvedValue(0),
        },

        // Bell Schedule Variant operations
        bellScheduleVariant: {
            findMany: vi.fn().mockResolvedValue([]),
            findUnique: vi.fn().mockResolvedValue(null),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
            update: vi.fn(),
            upsert: vi.fn(),
            delete: vi.fn(),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            count: vi.fn().mockResolvedValue(0),
        },

        // Time Slot operations
        timeSlot: {
            findMany: vi.fn().mockResolvedValue([]),
            findUnique: vi.fn().mockResolvedValue(null),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
            update: vi.fn(),
            upsert: vi.fn(),
            delete: vi.fn(),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            count: vi.fn().mockResolvedValue(0),
        },

        // Recurrence Rule operations
        dayRecurrenceRuleSet: {
            findMany: vi.fn().mockResolvedValue([]),
            findUnique: vi.fn().mockResolvedValue(null),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
            update: vi.fn(),
            upsert: vi.fn(),
            delete: vi.fn(),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            count: vi.fn().mockResolvedValue(0),
        },

        dayOfWeekRule: {
            findMany: vi.fn().mockResolvedValue([]),
            findUnique: vi.fn().mockResolvedValue(null),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
            update: vi.fn(),
            upsert: vi.fn(),
            delete: vi.fn(),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            count: vi.fn().mockResolvedValue(0),
        },

        patternBasedRule: {
            findMany: vi.fn().mockResolvedValue([]),
            findUnique: vi.fn().mockResolvedValue(null),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
            update: vi.fn(),
            upsert: vi.fn(),
            delete: vi.fn(),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            count: vi.fn().mockResolvedValue(0),
        },
    } as any

    return mockPrisma
}

// Mock factory functions for creating test data
export const mockBellScheduleFactory = {
    build: (overrides: Partial<any> = {}) => ({
        id: 'schedule-1',
        name: 'Test Schedule',
        description: 'Test schedule description',
        activeDaysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
        ...overrides,
    }),
}

export const mockBellScheduleDayFactory = {
    build: (overrides: Partial<any> = {}) => ({
        id: 'day-1',
        name: 'Regular Day',
        description: 'Regular school day',
        scheduleId: 'schedule-1',
        ...overrides,
    }),
}

export const mockTimeSlotFactory = {
    build: (overrides: Partial<any> = {}) => ({
        id: 'slot-1',
        name: 'Period 1',
        start: '08:00',
        end: '09:00',
        scheduleId: 'schedule-1',
        ...overrides,
    }),
}

// Global Prisma mock that can be imported
export const mockPrisma = createMockPrismaClient()

// Helper function to reset all mocks
export const resetDatabaseMocks = () => {
    Object.values(mockPrisma).forEach((model) => {
        if (typeof model === 'object' && model !== null) {
            Object.values(model).forEach((method) => {
                if (vi.isMockFunction(method)) {
                    method.mockClear()
                }
            })
        }
    })
}