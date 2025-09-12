import { z } from 'zod'

// Server-side configuration schema
export const ServerConfigSchema = z.object({
    sagaSmApiUrl: z.string().url().default('http://localhost:3000'),
    trpcBasePath: z.string().default('/trpc'),
    port: z.number().int().positive().default(3001),
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
})

export type ServerConfig = z.infer<typeof ServerConfigSchema>

// Get configuration from environment variables
// This only runs on the server side
export function getServerConfig(): ServerConfig {
    const config = {
        sagaSmApiUrl:
            process.env.SAGA_SM_API_URL ||
            process.env.NEXT_PUBLIC_SAGA_SM_API_URL ||
            'http://localhost:3000',
        trpcBasePath:
            process.env.TRPC_BASE_PATH || process.env.NEXT_PUBLIC_TRPC_BASE_PATH || '/trpc',
        port: parseInt(process.env.PORT || '3001', 10),
        nodeEnv: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
    }

    return ServerConfigSchema.parse(config)
}
