import { z } from 'zod';

// Ping message schema for tRPC input validation
export const PingMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  timestamp: z.string(),
});

// Pong response schema for tRPC output types
export const PongResponseSchema = z.object({
  reply: z.string(),
  originalMessage: z.string(),
  timestamp: z.string(),
});

// TypeScript types derived from schemas
export type PingMessageZ = z.infer<typeof PingMessageSchema>;
export type PongResponseZ = z.infer<typeof PongResponseSchema>;
