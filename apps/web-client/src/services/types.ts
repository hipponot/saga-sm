export interface ServiceInterface {
    executeEndpoint(endpoint: Endpoint, input: string): Promise<ApiResponse>
    generateCode(endpoint: Endpoint, input: string): string
}

export interface Endpoint {
    id: string
    name: string
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    description: string
    inputType: string | null
    sampleInput: string | null
    url: string
}

export interface ApiResponse {
    success: boolean
    data?: any
    error?: string
    timestamp: string
    duration: number
}

export interface ScheduleItem {
    id: string
    name: string
    description?: string
    startTime: string
    endTime: string
    recurring: boolean
    createdAt: string
    updatedAt?: string
}

export interface CreateScheduleInput {
    name: string
    description?: string
    startTime: string
    endTime: string
    recurring: boolean
}

export interface UpdateScheduleInput {
    id: string
    name?: string
    description?: string
    startTime?: string
    endTime?: string
    recurring?: boolean
}
