// Main app router combining all sectors
import { router } from '@saga-soa/api-core'
import { scheduleRouter } from './sectors/schedule/trpc/index.js'

export const appRouter = router({
    schedule: scheduleRouter
})

export type AppRouter = typeof appRouter

// Re-export event types
export * from './sectors/pubsub/index.js'