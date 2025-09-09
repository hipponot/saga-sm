import { injectable, inject } from 'inversify'
import { AbstractTRPCController, router } from '@saga-soa/api-core/abstract-trpc-controller'
import type { ILogger } from '@saga-soa/logger'
import type { IExampleHelper } from '../helpers/example_helper'
import {
    CreateExampleSchema,
    UpdateExampleSchema,
    GetExampleSchema,
    QueryExamplesSchema,
    DeleteExampleSchema,
    type CreateExampleInput,
    type UpdateExampleInput,
    type GetExampleInput,
    type QueryExamplesInput,
    type DeleteExampleInput,
    type ExampleData
} from './schema/example-schemas'

@injectable()
export class ExampleController extends AbstractTRPCController {
    readonly sectorName = 'example'

    constructor(
        @inject('ILogger') logger: ILogger,
        @inject('IExampleHelper') private exampleHelper: IExampleHelper
    ) {
        super(logger)
    }

    createRouter() {
        const t = this.createProcedure()

        return router({
            // Query all examples with filters
            queryExamples: t
                .input(QueryExamplesSchema)
                .query(async ({ input }: { input: QueryExamplesInput }) => {
                    // TODO: Implement example querying logic with filters
                    const mockData: ExampleData[] = []
                    return {
                        data: mockData,
                        total: 0,
                        limit: input.limit,
                        offset: input.offset
                    }
                }),

            // Get example by ID
            getExampleById: t
                .input(GetExampleSchema)
                .query(async ({ input }: { input: GetExampleInput }) => {
                    const mockExample: ExampleData = {
                        id: input.id,
                        title: this.exampleHelper.formatTitle('Sample Example'),
                        description: 'Sample example description',
                        status: 'draft',
                        priority: 'medium',
                        tags: [],
                        metadata: {},
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }
                    return mockExample
                }),

            // Create new example
            createExample: t
                .input(CreateExampleSchema)
                .mutation(async ({ input }: { input: CreateExampleInput }) => {
                    if (!this.exampleHelper.validateStatus(input.status)) {
                        throw new Error(`Invalid status: ${input.status}`)
                    }
                    
                    const newExample: ExampleData = {
                        id: this.exampleHelper.generateId(),
                        ...input,
                        title: this.exampleHelper.formatTitle(input.title),
                        priority: this.exampleHelper.calculatePriority(input.tags || []),
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }
                    return newExample
                }),

            // Update example
            updateExample: t
                .input(UpdateExampleSchema)
                .mutation(async ({ input }: { input: UpdateExampleInput }) => {
                    if (input.status && !this.exampleHelper.validateStatus(input.status)) {
                        throw new Error(`Invalid status: ${input.status}`)
                    }

                    const updatedExample: Partial<ExampleData> = {
                        ...input,
                        ...(input.title && { title: this.exampleHelper.formatTitle(input.title) }),
                        ...(input.tags && { priority: this.exampleHelper.calculatePriority(input.tags) }),
                        updatedAt: new Date().toISOString()
                    }
                    return updatedExample
                }),

            // Delete example
            deleteExample: t
                .input(DeleteExampleSchema)
                .mutation(async ({ input }: { input: DeleteExampleInput }) => {
                    // TODO: Implement example deletion logic
                    return {
                        success: true,
                        deletedId: input.id,
                        message: 'Example deleted successfully'
                    }
                })
        })
    }
}