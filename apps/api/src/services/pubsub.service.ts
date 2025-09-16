import { injectable, inject } from 'inversify'
import type { ILogger } from '@hipponot/soa-logger'
import { EventEmitter } from 'events'
import { randomUUID } from 'node:crypto'

export interface PubSubEvent {
    id: string
    name: string
    payload: any
    channel: string
    timestamp: string
    correlationId?: string
}

export interface EventSubscription {
    id: string
    channel: string
    eventTypes: string[]
    callback: (event: PubSubEvent) => void
}

@injectable()
export class PubSubService extends EventEmitter {
    private logger: ILogger
    private subscriptions = new Map<string, EventSubscription>()
    private eventHistory: PubSubEvent[] = []

    constructor(@inject('ILogger') logger: ILogger) {
        super()
        this.logger = logger
    }

    async sendEvent(eventData: {
        name: string
        payload: any
        clientEventId?: string
        correlationId?: string
        channel?: string
    }): Promise<{
        status: 'success' | 'error'
        eventId?: string
        error?: string
        emittedEvents?: PubSubEvent[]
    }> {
        try {
            const event: PubSubEvent = {
                id: eventData.clientEventId || randomUUID(),
                name: eventData.name,
                payload: eventData.payload,
                channel: eventData.channel || 'default',
                timestamp: new Date().toISOString(),
                correlationId: eventData.correlationId,
            }

            // Store in history
            this.eventHistory.push(event)

            // Handle ping-pong logic
            if (event.name === 'ping:message') {
                // Automatically create a pong response
                const pongEvent: PubSubEvent = {
                    id: randomUUID(),
                    name: 'pong:response',
                    payload: {
                        reply: `Pong: ${event.payload.message}`,
                        originalMessage: event.payload.message,
                        timestamp: new Date().toISOString(),
                    },
                    channel: 'pingpong',
                    timestamp: new Date().toISOString(),
                    correlationId: event.correlationId,
                }

                // Emit the pong event to subscribers
                this.emit('pong:response', pongEvent)
                this.eventHistory.push(pongEvent)

                this.logger.info('Ping-pong event pair processed', {
                    pingId: event.id,
                    pongId: pongEvent.id,
                    message: event.payload.message,
                })

                return {
                    status: 'success',
                    eventId: event.id,
                    emittedEvents: [event, pongEvent],
                }
            }

            // Emit event to subscribers
            this.emit(event.name, event)

            this.logger.info('Event sent successfully', {
                eventId: event.id,
                name: event.name,
                channel: event.channel,
            })

            return {
                status: 'success',
                eventId: event.id,
                emittedEvents: [event],
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            this.logger.error(
                'Failed to send event',
                error instanceof Error ? error : new Error(errorMessage),
                { eventData }
            )
            return {
                status: 'error',
                error: errorMessage,
            }
        }
    }

    subscribe(
        channel: string,
        eventTypes: string[],
        callback: (event: PubSubEvent) => void
    ): string {
        const subscriptionId = randomUUID()
        const subscription: EventSubscription = {
            id: subscriptionId,
            channel,
            eventTypes,
            callback,
        }

        this.subscriptions.set(subscriptionId, subscription)

        // Register listeners for each event type
        eventTypes.forEach(eventType => {
            this.on(eventType, callback)
        })

        this.logger.info('Subscription created', {
            subscriptionId,
            channel,
            eventTypes,
        })

        return subscriptionId
    }

    unsubscribe(subscriptionId: string): boolean {
        const subscription = this.subscriptions.get(subscriptionId)
        if (!subscription) {
            return false
        }

        // Remove listeners
        subscription.eventTypes.forEach(eventType => {
            this.removeListener(eventType, subscription.callback)
        })

        this.subscriptions.delete(subscriptionId)

        this.logger.info('Subscription removed', { subscriptionId })
        return true
    }

    getEventHistory(limit = 50): PubSubEvent[] {
        return this.eventHistory.slice(-limit)
    }

    getSubscriptionStats() {
        return {
            totalSubscriptions: this.subscriptions.size,
            activeChannels: Array.from(
                new Set(Array.from(this.subscriptions.values()).map(s => s.channel))
            ),
            connectionStatus: 'connected',
            lastActivity:
                this.eventHistory.length > 0
                    ? this.eventHistory[this.eventHistory.length - 1].timestamp
                    : new Date().toISOString(),
        }
    }

    createSSEHandler(req: any, res: any) {
        const channel = req.query.channel || 'pingpong'
        const eventTypes = req.query.eventTypes
            ? req.query.eventTypes.split(',')
            : ['ping:message', 'pong:response']

        // Set up SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control',
        })

        // Send initial connection event
        res.write(
            `data: ${JSON.stringify({
                type: 'connection',
                message: 'Connected to Schedule API SSE stream',
                channel,
                timestamp: new Date().toISOString(),
            })}\n\n`
        )

        // Subscribe to events
        const subscriptionId = this.subscribe(channel, eventTypes, event => {
            res.write(
                `data: ${JSON.stringify({
                    type: 'event',
                    event,
                })}\n\n`
            )
        })

        // Handle client disconnect
        req.on('close', () => {
            this.unsubscribe(subscriptionId)
            this.logger.info('SSE client disconnected', { subscriptionId })
        })

        // Send heartbeat every 30 seconds
        const heartbeat = setInterval(() => {
            res.write(
                `data: ${JSON.stringify({
                    type: 'heartbeat',
                    timestamp: new Date().toISOString(),
                })}\n\n`
            )
        }, 30000)

        req.on('close', () => {
            clearInterval(heartbeat)
        })
    }
}
