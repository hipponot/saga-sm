import { Endpoint } from './types'
import { getClientConfig } from '../config/client-config'

export const EXAMPLE_ENDPOINTS: Endpoint[] = [
    {
        id: 'example.queryExamples',
        name: 'Query Examples',
        method: 'GET',
        description: 'Query examples with filters, pagination and sorting',
        inputType: 'object',
        sampleInput: JSON.stringify({
            status: 'published',
            priority: 'high',
            limit: 10,
            offset: 0,
            sortBy: 'createdAt',
            sortOrder: 'desc'
        }, null, 2),
        url: '/trpc/example.queryExamples'
    },
    {
        id: 'example.getExampleById',
        name: 'Get Example by ID',
        method: 'GET', 
        description: 'Retrieve a specific example by its unique identifier',
        inputType: 'object',
        sampleInput: JSON.stringify({ id: 'example-123' }, null, 2),
        url: '/trpc/example.getExampleById'
    },
    {
        id: 'example.createExample',
        name: 'Create Example',
        method: 'POST',
        description: 'Create a new example with specified parameters',
        inputType: 'object',
        sampleInput: JSON.stringify({
            title: 'Sample Example',
            description: 'This is a sample example item',
            status: 'draft',
            priority: 'medium',
            tags: ['sample', 'demo'],
            metadata: {
                author: 'John Doe',
                category: 'tutorial'
            }
        }, null, 2),
        url: '/trpc/example.createExample'
    },
    {
        id: 'example.updateExample',
        name: 'Update Example',
        method: 'POST',
        description: 'Update an existing example with new parameters',
        inputType: 'object',
        sampleInput: JSON.stringify({
            id: 'example-123',
            title: 'Updated Example Title',
            status: 'published',
            priority: 'high',
            tags: ['updated', 'important']
        }, null, 2),
        url: '/trpc/example.updateExample'
    },
    {
        id: 'example.deleteExample',
        name: 'Delete Example',
        method: 'POST',
        description: 'Delete an example by its unique identifier',
        inputType: 'object',
        sampleInput: JSON.stringify({ id: 'example-123' }, null, 2),
        url: '/trpc/example.deleteExample'
    }
]

const config = getClientConfig()
export const API_BASE_URL = config.sagaSmApiUrl
export const TRPC_ENDPOINT = `${API_BASE_URL}${config.trpcBasePath}`

// Dynamic URL functions for runtime API URL changes
export function getApiBaseUrl(customUrl?: string): string {
    return customUrl || config.sagaSmApiUrl
}

export function getTrpcEndpoint(customUrl?: string): string {
    const baseUrl = customUrl || config.sagaSmApiUrl
    return `${baseUrl}${config.trpcBasePath}`
}