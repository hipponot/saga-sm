import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { ServiceInterface, Endpoint, ApiResponse } from './types'
import { TRPC_ENDPOINT } from './endpoints'

// This would normally import from @saga-sm/api-types when available
type AppRouter = any // Placeholder - will be replaced with proper types

export class TrpcClientService implements ServiceInterface {
    private client: ReturnType<typeof createTRPCClient<AppRouter>>

    constructor() {
        this.client = createTRPCClient<AppRouter>({
            links: [
                httpBatchLink({
                    url: TRPC_ENDPOINT,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }),
            ],
        })
    }

    async executeEndpoint(endpoint: Endpoint, input: string): Promise<ApiResponse> {
        const startTime = Date.now()

        try {
            let parsedInput: any = null

            if (input.trim()) {
                try {
                    parsedInput = JSON.parse(input)
                } catch (e) {
                    throw new Error(`Invalid JSON input: ${e}`)
                }
            }

            // For now, simulate the tRPC call since we don't have the actual API
            // This would be replaced with real tRPC calls once the API is available
            const result = await this.simulateApiCall(endpoint, parsedInput)

            return {
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
                duration: Date.now() - startTime
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                timestamp: new Date().toISOString(),
                duration: Date.now() - startTime
            }
        }
    }

    private async simulateApiCall(endpoint: Endpoint, input: any): Promise<any> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))

        switch (endpoint.id) {
            case 'schedule.getSchedules':
                return [
                    { id: '1', name: 'Daily Standup', startTime: '2024-01-15T09:00:00Z' },
                    { id: '2', name: 'Code Review', startTime: '2024-01-15T14:00:00Z' }
                ]
            case 'schedule.getScheduleById':
                return { id: input?.id || '1', name: 'Sample Schedule', startTime: '2024-01-15T09:00:00Z' }
            case 'schedule.createSchedule':
                return { ...input, id: Date.now().toString(), createdAt: new Date().toISOString() }
            case 'schedule.updateSchedule':
                return { ...input, updatedAt: new Date().toISOString() }
            case 'schedule.deleteSchedule':
                return { success: true, deletedId: input?.id }
            default:
                throw new Error(`Unknown endpoint: ${endpoint.id}`)
        }
    }

    generateCode(endpoint: Endpoint, input: string): string {
        const hasInput = input.trim().length > 0
        let code = `// tRPC Client Implementation\n`
        code += `import { createTRPCClient, httpBatchLink } from '@trpc/client'\n`
        code += `import type { AppRouter } from '@saga-sm/api-types'\n\n`

        code += `const client = createTRPCClient<AppRouter>({\n`
        code += `    links: [\n`
        code += `        httpBatchLink({\n`
        code += `            url: '${TRPC_ENDPOINT}',\n`
        code += `        }),\n`
        code += `    ],\n`
        code += `})\n\n`

        if (hasInput) {
            code += `const input = ${input}\n\n`
        }

        const isQuery = ['getSchedules', 'getScheduleById'].some(method => endpoint.id.includes(method))
        const methodType = isQuery ? 'query' : 'mutate'
        const inputParam = hasInput ? '(input)' : '()'

        code += `const result = await client.${endpoint.id}.${methodType}${inputParam}\n`
        code += `console.log('Result:', result)`

        return code
    }
}