import { ServiceInterface, Endpoint, ApiResponse } from './types'
import { getTrpcEndpoint } from './endpoints'

export class TrpcCurlService implements ServiceInterface {
    private currentUrl: string

    constructor(customApiUrl?: string, customBasePath?: string) {
        this.currentUrl = getTrpcEndpoint(customApiUrl, customBasePath)
    }

    // Method to update the API URL at runtime
    public updateApiUrl(customApiUrl: string, customBasePath?: string) {
        this.currentUrl = getTrpcEndpoint(customApiUrl, customBasePath)
    }

    // Get current URL being used
    public getCurrentUrl(): string {
        return this.currentUrl
    }
    async executeEndpoint(endpoint: Endpoint, input: string): Promise<ApiResponse> {
        const startTime = Date.now()

        try {
            const url = `${this.currentUrl}/${endpoint.id}`

            let body: Record<string, unknown> = {}
            if (input.trim()) {
                try {
                    body = JSON.parse(input)
                } catch (e) {
                    throw new Error(`Invalid JSON input: ${e}`)
                }
            }

            const isQuery = [
                'queryExamples',
                'getExampleById',
                'getSchedules',
                'getScheduleById',
                'getEventHistory',
                'getChannelInfo',
                'getServiceStatus',
                'getSubscriptionStats',
            ].some(method => endpoint.id.includes(method))

            // For queries, use GET with query parameters
            // For mutations, use POST with JSON body
            let requestConfig: RequestInit
            let finalUrl = url

            if (isQuery) {
                // For queries, append input as query parameter
                if (Object.keys(body).length > 0) {
                    const queryParam = encodeURIComponent(JSON.stringify(body))
                    finalUrl = `${url}?input=${queryParam}`
                }
                requestConfig = {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            } else {
                // For mutations, use POST with JSON body
                requestConfig = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                }
            }

            const response = await fetch(finalUrl, requestConfig)

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            const data = await response.json()

            return {
                success: true,
                data: data,
                timestamp: new Date().toISOString(),
                duration: Date.now() - startTime,
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                timestamp: new Date().toISOString(),
                duration: Date.now() - startTime,
            }
        }
    }

    generateCode(endpoint: Endpoint, input: string): string {
        const hasInput = input.trim().length > 0
        const url = `${this.currentUrl}/${endpoint.id}`

        let code = `# cURL Implementation\n`

        if (hasInput) {
            code += `# Input data\n`
            code += `INPUT='${input}'\n\n`
        }

        const isQuery = [
            'queryExamples',
            'getExampleById',
            'getSchedules',
            'getScheduleById',
            'getEventHistory',
            'getChannelInfo',
            'getServiceStatus',
            'getSubscriptionStats',
        ].some(method => endpoint.id.includes(method))

        if (isQuery) {
            // Generate GET request with query parameters
            let finalUrl = url
            if (hasInput) {
                finalUrl = `${url}?input=$(echo '$INPUT' | jq -c .)`
            }

            code += `curl -X GET \\\n`
            code += `  '${finalUrl}' \\\n`
            code += `  -H 'Content-Type: application/json' \\\n`
        } else {
            // Generate POST request with JSON body
            const bodyData = hasInput ? '$INPUT' : '{}'

            code += `curl -X POST \\\n`
            code += `  '${url}' \\\n`
            code += `  -H 'Content-Type: application/json' \\\n`

            if (hasInput) {
                code += `  -d "${bodyData}" \\\n`
            } else {
                code += `  -d '{}' \\\n`
            }
        }

        code += `  | jq '.'`

        return code
    }
}
