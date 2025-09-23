import { z } from 'zod';

// Base example data schema
export const ExampleDataSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Create example input schema
export const CreateExampleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional(),
});

// Update example input schema
export const UpdateExampleSchema = z.object({
  id: z.string().min(1, 'Example ID is required'),
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Query example schema
export const GetExampleSchema = z.object({
  id: z.string().min(1, 'Example ID is required'),
});

// Query examples with filters schema
export const QueryExamplesSchema = z.object({
  status: z.enum(['draft', 'published', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'priority']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Delete example schema
export const DeleteExampleSchema = z.object({
  id: z.string().min(1, 'Example ID is required'),
});

// Discriminated union schema for testing trpc-codegen
export const DiscriminatedUnionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('user'),
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    role: z.enum(['admin', 'user', 'guest']),
  }),
  z.object({
    type: z.literal('product'),
    id: z.string(),
    name: z.string(),
    price: z.number().positive(),
    category: z.enum(['electronics', 'clothing', 'books']),
  }),
  z.object({
    type: z.literal('order'),
    id: z.string(),
    userId: z.string(),
    productIds: z.array(z.string()),
    status: z.enum(['pending', 'shipped', 'delivered', 'cancelled']),
    total: z.number().positive(),
  }),
]);

// TypeScript types derived from schemas
export type ExampleDataZ = z.infer<typeof ExampleDataSchema>;
export type CreateExampleZ = z.infer<typeof CreateExampleSchema>;
export type UpdateExampleZ = z.infer<typeof UpdateExampleSchema>;
export type GetExampleZ = z.infer<typeof GetExampleSchema>;
export type QueryExamplesZ = z.infer<typeof QueryExamplesSchema>;
export type DeleteExampleZ = z.infer<typeof DeleteExampleSchema>;
export type DiscriminatedUnionZ = z.infer<typeof DiscriminatedUnionSchema>;
