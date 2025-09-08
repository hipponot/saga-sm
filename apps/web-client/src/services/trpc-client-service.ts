import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { ServiceInterface, Endpoint, ApiResponse } from './types'
import { TRPC_ENDPOINT } from './endpoints'

// This would normally import from @saga-sm/api-types when available
type AppRouter = any // Placeholder - will be replaced with proper types

export class TrpcClientService implements ServiceInterface {
    private client: ReturnType&lt;typeof createTRPCClient&lt;AppRouter&gt;&gt;

    constructor() {
        this.client = createTRPCClient&lt;AppRouter&gt;({
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

    async executeEndpoint(endpoint: Endpoint, input: string): Promise&lt;ApiResponse&gt; {
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

            let result: any

            // Parse the endpoint path to determine the method and procedure
            const [namespace, procedure] = endpoint.id.split('.')

            switch (endpoint.id) {
                case 'schedule.getSchedules':
                    result = await this.client.schedule.getSchedules.query()
                    break
                case 'schedule.getScheduleById':
                    result = await this.client.schedule.getScheduleById.query(parsedInput)
                    break
                case 'schedule.createSchedule':
                    result = await this.client.schedule.createSchedule.mutate(parsedInput)
                    break
                case 'schedule.updateSchedule':
                    result = await this.client.schedule.updateSchedule.mutate(parsedInput)
                    break
                case 'schedule.deleteSchedule':
                    result = await this.client.schedule.deleteSchedule.mutate(parsedInput)
                    break
                default:
                    throw new Error(`Unknown endpoint: ${endpoint.id}`)
            }

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

    generateCode(endpoint: Endpoint, input: string): string {
        const hasInput = input.trim().length > 0
        let code = `// tRPC Client Implementation\n`
        code += `import { createTRPCClient, httpBatchLink } from '@trpc/client'\n`
        code += `import type { AppRouter } from '@saga-sm/api-types'\n\n`
        
        code += `const client = createTRPCClient&lt;AppRouter&gt;({\n`
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