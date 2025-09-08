import 'reflect-metadata'
import { container } from './inversify.config.js'
import { ExpressServer } from '@saga-soa/api-core/express-server'
import { TRPCServer } from '@saga-soa/api-core/trpc-server'
import type { ILogger } from '@saga-soa/logger'

async function bootstrap() {
    const logger = container.get('ILogger')

    try {
        logger.info('Starting saga-sm service...')

        // Initialize servers
        const expressServer = container.get(ExpressServer)
        const trpcServer = container.get(TRPCServer)

        // Initialize and start servers
        await expressServer.init(container, [])
        await trpcServer.init(container, [])
        
        // Mount tRPC to Express app
        await trpcServer.mountToApp(expressServer.getApp())
        
        // Start Express server
        expressServer.start()

        logger.info('saga-sm service started successfully')
    } catch (error) {
        logger.error('Failed to start saga-sm service:', error instanceof Error ? error : new Error(String(error)))
        process.exit(1)
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    const logger = container.get('ILogger')
    logger.info('Shutting down saga-sm service...')
    process.exit(0)
})

bootstrap().catch(console.error)