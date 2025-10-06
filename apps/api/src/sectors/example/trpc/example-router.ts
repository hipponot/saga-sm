import { injectable, inject } from "inversify";
import {
  AbstractTRPCController,
  router,
} from "@hipponot/soa-api-core/abstract-trpc-controller";
import type { ILogger } from "@hipponot/soa-logger";
import type { IExampleHelper } from "../helpers/example_helper.js";
import {
  CreateExampleSchema,
  UpdateExampleSchema,
  GetExampleSchema,
  QueryExamplesSchema,
  DeleteExampleSchema,
  DiscriminatedUnionSchema,
  type CreateExampleZ,
  type UpdateExampleZ,
  type GetExampleZ,
  type QueryExamplesZ,
  type DeleteExampleZ,
  type ExampleDataZ,
  type DiscriminatedUnionZ,
} from "@saga-sm/api-types/schemas";

@injectable()
export class ExampleController extends AbstractTRPCController {
  readonly sectorName = "example";

  constructor(
    @inject("ILogger") logger: ILogger,
    @inject("IExampleHelper") private exampleHelper: IExampleHelper,
  ) {
    super(logger);
  }

  createRouter(): ReturnType<typeof router> {
    const t = this.createProcedure();

    return router({
      // Query all examples with filters
      queryExamples: t
        .input(QueryExamplesSchema)
        .query(async ({ input }: { input: QueryExamplesZ }) => {
          // TODO: Implement example querying logic with filters
          const mockData: ExampleDataZ[] = [];
          return {
            data: mockData,
            total: 0,
            limit: input.limit,
            offset: input.offset,
          };
        }),

      // Get example by ID
      getExampleById: t
        .input(GetExampleSchema)
        .query(async ({ input }: { input: GetExampleZ }) => {
          const mockExample: ExampleDataZ = {
            id: input.id,
            title: this.exampleHelper.formatTitle("Sample Example"),
            description: "Sample example description",
            status: "draft",
            priority: "medium",
            tags: [],
            metadata: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return mockExample;
        }),

      // Create new example
      createExample: t
        .input(CreateExampleSchema)
        .mutation(async ({ input }: { input: CreateExampleZ }) => {
          if (!this.exampleHelper.validateStatus(input.status)) {
            throw new Error(`Invalid status: ${input.status}`);
          }

          const newExample: ExampleDataZ = {
            id: this.exampleHelper.generateId(),
            ...input,
            title: this.exampleHelper.formatTitle(input.title),
            priority: this.exampleHelper.calculatePriority(input.tags || []),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return newExample;
        }),

      // Update example
      updateExample: t
        .input(UpdateExampleSchema)
        .mutation(async ({ input }: { input: UpdateExampleZ }) => {
          if (
            input.status &&
            !this.exampleHelper.validateStatus(input.status)
          ) {
            throw new Error(`Invalid status: ${input.status}`);
          }

          const updatedExample: Partial<ExampleDataZ> = {
            ...input,
            ...(input.title && {
              title: this.exampleHelper.formatTitle(input.title),
            }),
            ...(input.tags && {
              priority: this.exampleHelper.calculatePriority(input.tags),
            }),
            updatedAt: new Date().toISOString(),
          };
          return updatedExample;
        }),

      // Delete example
      deleteExample: t
        .input(DeleteExampleSchema)
        .mutation(async ({ input }: { input: DeleteExampleZ }) => {
          // TODO: Implement example deletion logic
          return {
            success: true,
            deletedId: input.id,
            message: "Example deleted successfully",
          };
        }),

      // Get discriminated union example for testing trpc-codegen
      getDiscriminatedUnion: t.query(async (): Promise<DiscriminatedUnionZ> => {
        // Return a mock discriminated union object
        const mockDiscriminatedUnion: DiscriminatedUnionZ = {
          type: "user",
          id: "user-123",
          name: "John Doe",
          email: "john.doe@example.com",
          role: "admin",
        };
        return mockDiscriminatedUnion;
      }),
    });
  }
}
