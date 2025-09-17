import { injectable, inject } from 'inversify'
import { AbstractTRPCController, router } from '@hipponot/soa-api-core/abstract-trpc-controller'
import type { ILogger } from '@hipponot/soa-logger'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { PingMessageSchema, type PingMessageZ } from './schema/pubsub-schemas.js'
import type { PubSubService } from '../../../services/pubsub.service.js'

@injectable()
export class PubSubController extends AbstractTRPCController {
  readonly sectorName = 'pubsub'
  private pubsubService: PubSubService

  constructor(
    @inject('ILogger') logger: ILogger,
    @inject('PubSubService') pubsubService: PubSubService
  ) {
    super(logger)
    this.pubsubService = pubsubService
  }

  createRouter(): ReturnType<typeof router> {
    const t = this.createProcedure()

    return router({
      // Send a ping message and get automatic pong response via pubsub
      ping: t.input(PingMessageSchema).mutation(async ({ input }: { input: PingMessageZ }) => {
        try {
          // Send the ping event via pubsub service
          const result = await this.pubsubService.sendEvent({
            name: 'ping:message',
            payload: input,
            channel: 'pingpong',
            clientEventId: randomUUID(),
            correlationId: randomUUID(),
          })

          if (result.status === 'error') {
            throw new Error(result.error || 'Failed to send ping event')
          }

          return {
            success: true,
            message: `Ping sent successfully: "${input.message}"`,
            eventId: result.eventId,
            emittedEvents: result.emittedEvents,
          }
        } catch (error) {
          this.logger.error(
            'Failed to send ping event',
            error instanceof Error ? error : new Error(String(error)),
            { input }
          )
          throw new Error(
            `Failed to send ping: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      }),

      // Send a custom event via pubsub
      sendEvent: t
        .input(
          z.object({
            name: z
              .string()
              .regex(/^[^:]+:[^:]+$/, 'Event name must be in format "category:action"'),
            payload: z.any(),
            channel: z.string().optional(),
            options: z
              .object({
                clientEventId: z.string().optional(),
                correlationId: z.string().optional(),
              })
              .optional(),
          })
        )
        .mutation(async ({ input }) => {
          try {
            const channel = input.channel || 'default'

            const result = await this.pubsubService.sendEvent({
              name: input.name,
              payload: input.payload,
              channel,
              clientEventId: input.options?.clientEventId,
              correlationId: input.options?.correlationId,
            })

            if (result.status === 'error') {
              throw new Error(result.error || 'Failed to send event')
            }

            return {
              success: true,
              eventId: result.eventId,
              emittedEvents: result.emittedEvents,
              message: `Event "${input.name}" sent successfully`,
            }
          } catch (error) {
            this.logger.error(
              'Failed to send custom event',
              error instanceof Error ? error : new Error(String(error)),
              { input }
            )
            throw new Error(
              `Failed to send event: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          }
        }),

      // Get event history
      getEventHistory: t.query(() => {
        return {
          events: this.pubsubService.getEventHistory(),
          total: this.pubsubService.getEventHistory().length,
        }
      }),

      // Get channel information
      getChannelInfo: t.query(() => {
        return {
          channel: 'pingpong',
          eventTypes: ['ping:message', 'pong:response'],
          description: 'Ping-pong demonstration channel for SSE testing',
          activeSubscribers: this.pubsubService.getSubscriptionStats().totalSubscriptions,
        }
      }),

      // Get pubsub service status
      getServiceStatus: t.query(() => {
        const stats = this.pubsubService.getSubscriptionStats()
        return {
          status: 'running',
          channels: stats.activeChannels,
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          subscriptions: stats.totalSubscriptions,
          connectionStatus: stats.connectionStatus,
          lastActivity: stats.lastActivity,
        }
      }),

      // Subscribe to a channel (for SSE events)
      subscribe: t
        .input(
          z.object({
            channel: z.string(),
            eventTypes: z.array(z.string()).optional(),
          })
        )
        .mutation(async ({ input }) => {
          try {
            // This would typically set up a WebSocket or SSE connection
            // For now, we'll return subscription info
            const subscriptionId = randomUUID()

            this.logger.info('Subscription request received', {
              channel: input.channel,
              subscriptionId,
              eventTypes: input.eventTypes,
            })

            return {
              success: true,
              subscriptionId,
              channel: input.channel,
              eventTypes: input.eventTypes || ['*'],
              message: 'Subscription established (use /events SSE endpoint for real-time events)',
              timestamp: new Date().toISOString(),
            }
          } catch (error) {
            this.logger.error(
              'Failed to create subscription',
              error instanceof Error ? error : new Error(String(error)),
              { input }
            )
            throw new Error(
              `Failed to subscribe: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          }
        }),

      // Unsubscribe from a channel
      unsubscribe: t
        .input(
          z.object({
            subscriptionId: z.string(),
          })
        )
        .mutation(async ({ input }) => {
          try {
            const success = this.pubsubService.unsubscribe(input.subscriptionId)

            return {
              success,
              subscriptionId: input.subscriptionId,
              message: success ? 'Subscription removed successfully' : 'Subscription not found',
              timestamp: new Date().toISOString(),
            }
          } catch (error) {
            this.logger.error(
              'Failed to unsubscribe',
              error instanceof Error ? error : new Error(String(error)),
              { input }
            )
            throw new Error(
              `Failed to unsubscribe: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          }
        }),

      // Get subscription statistics
      getSubscriptionStats: t.query(() => {
        return this.pubsubService.getSubscriptionStats()
      }),
    })
  }
}
