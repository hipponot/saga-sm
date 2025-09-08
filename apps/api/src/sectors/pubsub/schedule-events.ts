// Schedule-related PubSub event definitions
export const SCHEDULE_EVENTS = {
    SCHEDULE_CREATED: 'schedule:created',
    SCHEDULE_UPDATED: 'schedule:updated', 
    SCHEDULE_DELETED: 'schedule:deleted',
    SCHEDULE_STARTED: 'schedule:started',
    SCHEDULE_COMPLETED: 'schedule:completed'
} as const

export type ScheduleEventType = typeof SCHEDULE_EVENTS[keyof typeof SCHEDULE_EVENTS]

// Event payload interfaces
export interface ScheduleCreatedPayload {
    scheduleId: string
    name: string
    startTime: string
    endTime: string
    createdBy: string
}

export interface ScheduleUpdatedPayload {
    scheduleId: string
    changes: Record&lt;string, any&gt;
    updatedBy: string
}

export interface ScheduleDeletedPayload {
    scheduleId: string
    deletedBy: string
}

export interface ScheduleStatusPayload {
    scheduleId: string
    status: 'started' | 'completed'
    timestamp: string
}