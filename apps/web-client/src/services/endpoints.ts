import { Endpoint } from './types'

export const SCHEDULE_ENDPOINTS: Endpoint[] = [
    {
        id: 'schedule.getSchedules',
        name: 'Get All Schedules',
        method: 'GET',
        description: 'Retrieve all schedules with pagination support',
        inputType: null,
        sampleInput: null,
        url: '/trpc/schedule.getSchedules'
    },
    {
        id: 'schedule.getScheduleById',
        name: 'Get Schedule by ID',
        method: 'GET', 
        description: 'Retrieve a specific schedule by its unique identifier',
        inputType: 'object',
        sampleInput: JSON.stringify({ id: 'schedule-123' }, null, 2),
        url: '/trpc/schedule.getScheduleById'
    },
    {
        id: 'schedule.createSchedule',
        name: 'Create Schedule',
        method: 'POST',
        description: 'Create a new schedule with specified parameters',
        inputType: 'object',
        sampleInput: JSON.stringify({
            name: 'Daily Standup',
            description: 'Team synchronization meeting',
            startTime: '2024-01-15T09:00:00Z',
            endTime: '2024-01-15T09:30:00Z',
            recurring: true
        }, null, 2),
        url: '/trpc/schedule.createSchedule'
    },
    {
        id: 'schedule.updateSchedule',
        name: 'Update Schedule',
        method: 'POST',
        description: 'Update an existing schedule with new parameters',
        inputType: 'object',
        sampleInput: JSON.stringify({
            id: 'schedule-123',
            name: 'Updated Meeting Name',
            startTime: '2024-01-15T10:00:00Z',
            endTime: '2024-01-15T11:00:00Z'
        }, null, 2),
        url: '/trpc/schedule.updateSchedule'
    },
    {
        id: 'schedule.deleteSchedule',
        name: 'Delete Schedule',
        method: 'POST',
        description: 'Delete a schedule by its unique identifier',
        inputType: 'object',
        sampleInput: JSON.stringify({ id: 'schedule-123' }, null, 2),
        url: '/trpc/schedule.deleteSchedule'
    }
]

export const API_BASE_URL = 'http://localhost:3000'
export const TRPC_ENDPOINT = `${API_BASE_URL}/trpc`