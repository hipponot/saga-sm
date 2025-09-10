import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { ServiceInterface, Endpoint, ApiResponse } from './types'
import { TRPC_ENDPOINT, getTrpcEndpoint } from './endpoints'

// This would normally import from @saga-sm/api-types when available
type AppRouter = any // Placeholder - will be replaced with proper types

export class TrpcClientService implements ServiceInterface {
    private client: any // Temporarily using any to bypass typing issues
    private currentUrl: string

    constructor(customApiUrl?: string, customBasePath?: string) {
        this.currentUrl = getTrpcEndpoint(customApiUrl, customBasePath)
        this.client = this.createClient(this.currentUrl)
    }

    private createClient(url: string) {
        return createTRPCClient<AppRouter>({
            links: [
                httpBatchLink({
                    url,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }),
            ],
        })
    }

    // Method to update the API URL at runtime
    public updateApiUrl(customApiUrl: string, customBasePath?: string) {
        const newUrl = getTrpcEndpoint(customApiUrl, customBasePath)
        if (newUrl !== this.currentUrl) {
            this.currentUrl = newUrl
            this.client = this.createClient(this.currentUrl)
        }
    }

    // Get current URL being used
    public getCurrentUrl(): string {
        return this.currentUrl
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

            let result: any

            // Parse the endpoint path to determine the method and procedure
            const [namespace, procedure] = endpoint.id.split('.')

            switch (endpoint.id) {
                case 'example.queryExamples':
                    result = await this.client.example.queryExamples.query(parsedInput || {})
                    break
                case 'example.getExampleById':
                    result = await this.client.example.getExampleById.query(parsedInput)
                    break
                case 'example.createExample':
                    result = await this.client.example.createExample.mutate(parsedInput)
                    break
                case 'example.updateExample':
                    result = await this.client.example.updateExample.mutate(parsedInput)
                    break
                case 'example.deleteExample':
                    result = await this.client.example.deleteExample.mutate(parsedInput)
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

        code += `const client = createTRPCClient<AppRouter>({\n`
        code += `    links: [\n`
        code += `        httpBatchLink({\n`
        code += `            url: '${this.currentUrl}',\n`
        code += `        }),\n`
        code += `    ],\n`
        code += `})\n\n`

        if (hasInput) {
            code += `const input = ${input}\n\n`
        }

        const isQuery = ['queryExamples', 'getExampleById'].some(method => endpoint.id.includes(method))
        const methodType = isQuery ? 'query' : 'mutate'
        const inputParam = hasInput ? '(input)' : '()'

        code += `const result = await client.${endpoint.id}.${methodType}${inputParam}\n`
        code += `console.log('Result:', result)`

        return code
    }
}