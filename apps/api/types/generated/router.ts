// Auto-generated - do not edit
// This file is dynamically generated based on sectors in src/sectors/*/trpc/
import { initTRPC } from '@trpc/server';
import * as exampleSchemas from './schemas/example-schemas.js';
import * as pubsubSchemas from './schemas/pubsub-schemas.js';

const t = initTRPC.create();

export const staticApiRouter = t.router({
  example: t.router({
    queryExamples: t.procedure.input(exampleSchemas.QueryExamplesSchema).query(() => ({})),
    getExampleById: t.procedure.input(exampleSchemas.GetExampleSchema).query(() => ({})),
    createExample: t.procedure.input(exampleSchemas.CreateExampleSchema).mutation(() => ({})),
    updateExample: t.procedure.input(exampleSchemas.UpdateExampleSchema).mutation(() => ({})),
    deleteExample: t.procedure.input(exampleSchemas.DeleteExampleSchema).mutation(() => ({})),
  }),
  pubsub: t.router({
    ping: t.procedure.input(pubsubSchemas.PingMessageSchema).mutation(() => ({})),
    getEventHistory: t.procedure.query(() => []),
    getChannelInfo: t.procedure.query(() => []),
    getServiceStatus: t.procedure.query(() => []),
    getSubscriptionStats: t.procedure.query(() => []),
  }),
});

export type ApiRouter = typeof staticApiRouter;
