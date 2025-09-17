import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Container } from 'inversify';
import { ExpressServer } from '@hipponot/soa-api-core/express-server';
import { TRPCServer } from '@hipponot/soa-api-core/trpc-server';
import { ExampleController } from '../example-router';
import { ExampleHelper } from '../../helpers/example_helper';
import type { ILogger } from '@hipponot/soa-logger';
import type { IExampleHelper } from '../../helpers/example_helper';
import type { DiscriminatedUnionZ } from '../schema/example-schemas';
import 'reflect-metadata';

const mockLogger: ILogger = {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
};

describe('Example Discriminated Union Integration Tests', () => {
    let app: express.Application;
    let container: Container;

    beforeAll(async () => {
        // Setup DI container
        container = new Container();
        container.bind<ILogger>('ILogger').toConstantValue(mockLogger);
        container.bind<IExampleHelper>('IExampleHelper').to(ExampleHelper);
        container.bind<ExampleController>(ExampleController).toSelf();

        // Configure Express server
        const expressServer = new ExpressServer(mockLogger);
        await expressServer.init(container, []);
        app = expressServer.getApp();

        // Get the TRPCServer instance
        const trpcServer = new TRPCServer({
            basePath: '/trpc',
            cors: {
                origin: true,
                credentials: true,
            },
        }, mockLogger);

        // Get controller instance and add router
        const exampleController = container.get<ExampleController>(ExampleController);
        trpcServer.addRouter('example', exampleController.createRouter());

        // Create tRPC middleware
        const trpcMiddleware = trpcServer.createExpressMiddleware();

        // Mount tRPC on the configured base path
        app.use(trpcServer.getBasePath(), trpcMiddleware);
    });

    afterAll(() => {
        if (container) {
            container.unbindAll();
        }
    });

    describe('getDiscriminatedUnion endpoint', () => {
        it('should return a discriminated union object via HTTP', async () => {
            const response = await request(app)
                .get('/trpc/example.getDiscriminatedUnion')
                .expect(200);

            expect(response.body).toBeDefined();
            const result = response.body.result.data;

            // Verify it's a valid discriminated union
            expect(result).toBeDefined();
            expect(result.type).toBeDefined();
            expect(result.id).toBeDefined();
            expect(typeof result.id).toBe('string');

            // Verify the discriminator field
            expect(['user', 'product', 'order']).toContain(result.type);
        });

        it('should return a user type discriminated union with correct fields', async () => {
            const response = await request(app)
                .get('/trpc/example.getDiscriminatedUnion')
                .expect(200);

            const result = response.body.result.data;

            // Since our mock returns a user type, verify user-specific fields
            if (result.type === 'user') {
                expect(result.name).toBeDefined();
                expect(result.email).toBeDefined();
                expect(result.role).toBeDefined();
                expect(['admin', 'user', 'guest']).toContain(result.role);
                expect(typeof result.name).toBe('string');
                expect(typeof result.email).toBe('string');

                // Verify email format (basic check)
                expect(result.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
            }
        });

        it('should have valid TypeScript discriminated union structure', async () => {
            const response = await request(app)
                .get('/trpc/example.getDiscriminatedUnion')
                .expect(200);

            const result = response.body.result.data;

            // Type guard function to validate discriminated union structure
            const isValidDiscriminatedUnion = (obj: any): obj is DiscriminatedUnionZ => {
                if (!obj || typeof obj !== 'object') return false;

                switch (obj.type) {
                    case 'user':
                        return (
                            typeof obj.id === 'string' &&
                            typeof obj.name === 'string' &&
                            typeof obj.email === 'string' &&
                            ['admin', 'user', 'guest'].includes(obj.role)
                        );
                    case 'product':
                        return (
                            typeof obj.id === 'string' &&
                            typeof obj.name === 'string' &&
                            typeof obj.price === 'number' &&
                            obj.price > 0 &&
                            ['electronics', 'clothing', 'books'].includes(obj.category)
                        );
                    case 'order':
                        return (
                            typeof obj.id === 'string' &&
                            typeof obj.userId === 'string' &&
                            Array.isArray(obj.productIds) &&
                            obj.productIds.every((id: any) => typeof id === 'string') &&
                            ['pending', 'shipped', 'delivered', 'cancelled'].includes(obj.status) &&
                            typeof obj.total === 'number' &&
                            obj.total > 0
                        );
                    default:
                        return false;
                }
            };

            expect(isValidDiscriminatedUnion(result)).toBe(true);
        });

        it('should maintain consistent data structure across multiple calls', async () => {
            const response1 = await request(app)
                .get('/trpc/example.getDiscriminatedUnion')
                .expect(200);

            const response2 = await request(app)
                .get('/trpc/example.getDiscriminatedUnion')
                .expect(200);

            const result1 = response1.body.result.data;
            const result2 = response2.body.result.data;

            // Since this is a mock endpoint, results should be consistent
            expect(result1).toEqual(result2);
            expect(result1.type).toBe(result2.type);
            expect(result1.id).toBe(result2.id);
        });
    });
});