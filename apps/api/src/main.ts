import 'reflect-metadata'
import { container } from './inversify.config.js'
import { ExpressServer, TRPCServer } from '@saga-soa/api-core'
import { PubSubServer } from '@saga-soa/pubsub-core/server'
import { ILogger } from '@saga-soa/logger'
import { IMongoConnMgr } from '@saga-soa/db'

async function bootstrap() {
    const logger = container.get<ILogger>('ILogger')
    const mongoConnMgr = container.get<IMongoConnMgr>('IMongoConnMgr')

    try {
        logger.info('Starting saga-sm service...')

        // Connect to database
        await mongoConnMgr.connect()
        logger.info('Database connection established')

        // Initialize servers
        const expressServer = container.get(ExpressServer)
        const trpcServer = container.get(TRPCServer)  
        const pubsubServer = container.get(PubSubServer)

        // Start servers
        await expressServer.start()
        await trpcServer.start()
        await pubsubServer.start()

        logger.info('saga-sm service started successfully')
    } catch (error) {
        logger.error('Failed to start saga-sm service:', error)
        process.exit(1)
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    const logger = container.get<ILogger>('ILogger')
    logger.info('Shutting down saga-sm service...')
    
    const mongoConnMgr = container.get<IMongoConnMgr>('IMongoConnMgr')
    await mongoConnMgr.disconnect()
    
    process.exit(0)
})

bootstrap().catch(console.error)