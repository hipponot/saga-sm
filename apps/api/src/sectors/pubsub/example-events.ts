// Example-related PubSub event definitions
export const EXAMPLE_EVENTS = {
    EXAMPLE_CREATED: 'example:created',
    EXAMPLE_UPDATED: 'example:updated',
    EXAMPLE_DELETED: 'example:deleted',
    EXAMPLE_STATUS_CHANGED: 'example:status_changed',
    EXAMPLE_PRIORITY_CHANGED: 'example:priority_changed',
} as const

export type ExampleEventType = (typeof EXAMPLE_EVENTS)[keyof typeof EXAMPLE_EVENTS]

// Event payload interfaces
export interface ExampleCreatedPayload {
    exampleId: string
    title: string
    status: 'draft' | 'published' | 'archived'
    priority: 'low' | 'medium' | 'high'
    createdBy: string
    createdAt: string
}

export interface ExampleUpdatedPayload {
    exampleId: string
    changes: Record<string, any>
    updatedBy: string
    updatedAt: string
}

export interface ExampleDeletedPayload {
    exampleId: string
    deletedBy: string
    deletedAt: string
}

export interface ExampleStatusChangedPayload {
    exampleId: string
    previousStatus: 'draft' | 'published' | 'archived'
    newStatus: 'draft' | 'published' | 'archived'
    changedBy: string
    timestamp: string
}

export interface ExamplePriorityChangedPayload {
    exampleId: string
    previousPriority: 'low' | 'medium' | 'high'
    newPriority: 'low' | 'medium' | 'high'
    changedBy: string
    timestamp: string
}
