import { ServiceInterface, Endpoint, ApiResponse } from './types'
import { TRPC_ENDPOINT } from './endpoints'

export class TrpcCurlService implements ServiceInterface {
    async executeEndpoint(endpoint: Endpoint, input: string): Promise<ApiResponse> {
        const startTime = Date.now()

        try {
            const url = `${TRPC_ENDPOINT}/${endpoint.id}`
            
            let body: any = {}
            if (input.trim()) {
                try {
                    body = JSON.parse(input)
                } catch (e) {
                    throw new Error(`Invalid JSON input: ${e}`)
                }
            }

            const isQuery = ['getSchedules', 'getScheduleById'].some(method => endpoint.id.includes(method))
            
            // For queries, we need to send input as URL parameters or in a different format
            // For mutations, we send as POST body
            const requestConfig: RequestInit = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(isQuery ? { input: body } : body)
            }

            const response = await fetch(url, requestConfig)
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            const data = await response.json()

            return {
                success: true,
                data: data,
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
        const url = `${TRPC_ENDPOINT}/${endpoint.id}`
        
        let code = `# cURL Implementation\n`
        
        if (hasInput) {
            code += `# Input data\n`
            code += `INPUT='${input}'\n\n`
        }

        const isQuery = ['getSchedules', 'getScheduleById'].some(method => endpoint.id.includes(method))
        const bodyData = hasInput ? (isQuery ? '{"input": $INPUT}' : '$INPUT') : '{}'

        code += `curl -X POST \\\n`
        code += `  '${url}' \\\n`
        code += `  -H 'Content-Type: application/json' \\\n`
        
        if (hasInput) {
            code += `  -d "${bodyData}" \\\n`
        } else {
            code += `  -d '{}' \\\n`
        }
        
        code += `  | jq '.'`

        return code
    }
}