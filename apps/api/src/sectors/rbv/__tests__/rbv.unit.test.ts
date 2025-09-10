// rbv.unit.test.ts
import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach } from 'vitest'
import { Container } from 'inversify'
import { RBVHelper } from '../rbv_helper';
import { BellScheduleFactory, UpsertBellScheduleVariantInputFactory, UpsertBellScheduleInputFactory } from './builders/rbv_builders';
import { BellSchedule } from '../rbv.types';
import { prisma } from '@repo/db';
import { ILogger } from '@saga-soa/logger';

const mockLogger: ILogger = {
  info: console.log,
  warn: console.log,
  error: console.log,
  debug: console.log,
};

describe('RBVHelper', () => {
  let container: Container
  let rbv_helper: RBVHelper

  beforeEach(async () => {
    container = new Container();
    container.bind('ILogger').toConstantValue(mockLogger);
    container.bind<RBVHelper>('RBVHelper').to(RBVHelper);
    rbv_helper = container.get('RBVHelper');

    // Clean up all test data
    await prisma.period.deleteMany();
    await prisma.bellScheduleVariant.deleteMany();
    await prisma.bellSchedule.deleteMany();
  })

  afterEach(() => {
    container.unbindAll()
  })

  describe('Bell Schedule CRUD', () => {
    describe('Bell Schedule Retrieval', () => {
      it('retrieves a bell schedule by id', async () => {
        // ARRANGE
        const schedule = BellScheduleFactory.build();
        await prisma.bellSchedule.create({
          data: schedule,
        });

        // ACT
        const res = await rbv_helper.get_schedule(schedule.id);
        if (!res.success) throw new Error(res.message);
        const retrieved_schedule = res.data;

        // ASSERT
        expect(retrieved_schedule).toEqual(expect.objectContaining({
          id: schedule.id,
          name: schedule.name,
          description: schedule.description,
          variants: [],
        }));
      });

      it('returns an error if the bell schedule does not exist', async () => {
        // ARRANGE
        // ACT
        const res = await rbv_helper.get_schedule('nonexistent-id');

        // ASSERT
        expect(res.success).toBe(false);
        expect(res.message).toBe('Requested bell schedule not found');
      });
    });

    describe('Bell Schedule Creation & Update', () => {
      it('creates a bell schedule without specifying an id', async () => {
        // ARRANGE
        const input = UpsertBellScheduleInputFactory.build({
          id: undefined,
        });

        // ACT
        const res = await rbv_helper.upsert_schedule(input);
        if (!res.success) throw new Error(res.message);
        const created_schedule = res.data;

        // ASSERT
        expect(created_schedule).toEqual(expect.objectContaining({
          name: input.name,
          description: input.description,
          variants: [],
        }));
        expect(created_schedule.id).toBeDefined();
      });

      it('creates a bell schedule with a specified id', async () => {
        // ARRANGE
        const input = UpsertBellScheduleInputFactory.build({
          id: 'test-schedule-id',
        });

        // ACT
        const res = await rbv_helper.upsert_schedule(input);
        if (!res.success) throw new Error(res.message);
        const created_schedule = res.data;

        // ASSERT
        expect(created_schedule).toEqual(expect.objectContaining({
          id: 'test-schedule-id',
          name: input.name,
          description: input.description,
          variants: [],
        }));
      });

      it('Updates an existing bell schedule without modifying the variants', async () => {
        // ARRANGE
        const schedule = BellScheduleFactory.build();
        await prisma.bellSchedule.create({
          data: schedule,
        });

        // ACT
        const res = await rbv_helper.upsert_schedule({
          id: schedule.id,
          name: 'New Name',
          description: schedule.description,
        });
        if (!res.success) throw new Error(res.message);
        const returned_schedule = res.data;
        const fetched_schedule = await prisma.bellSchedule.findUnique({
          where: { id: schedule.id },
          include: { variants: { include: { periods: true } } }
        });

        // ASSERT
        expect(returned_schedule.name).toBe('New Name');
        expect(returned_schedule.id).toBe(schedule.id);
        expect(fetched_schedule?.name).toBe('New Name');
      });
    });

    describe('Bell Schedule Deletion', () => {
      it('deletes a bell schedule by id', async () => {
        // ARRANGE
        const schedule = BellScheduleFactory.build();
        await prisma.bellSchedule.create({
          data: schedule,
        });

        // ACT
        const res = await rbv_helper.delete_schedule({ id: schedule.id });
        if (!res.success) throw new Error(res.message);

        // ASSERT
        const fetched_schedule = await prisma.bellSchedule.findUnique({
          where: { id: schedule.id }
        });
        expect(fetched_schedule).toBeNull();
      });
    });
  });

  describe('Bell Schedule Variant CUD', () => {
    let schedule: BellSchedule;

    beforeEach(async () => {
      schedule = BellScheduleFactory.build();
      await prisma.bellSchedule.create({
        data: {
          ...schedule,
          variants: {
            create: [],
          },
        },
      });
    });

    describe('Bell Schedule Variant Creation', () => {
      it('Adds a new variant to a bell schedule', async () => {
        // ARRANGE
        const input = UpsertBellScheduleVariantInputFactory.build({
          scheduleId: schedule.id,
          id: undefined,
        });

        // ACT
        const res = await rbv_helper.upsert_variant(input);
        if (!res.success) throw new Error(res.message);
        const created_variant = res.data;
        const fetched_schedule = await prisma.bellSchedule.findUnique({
          where: { id: schedule.id },
          include: { variants: { include: { periods: true } } }
        });

        // ASSERT
        expect(created_variant).toEqual(expect.objectContaining({
          name: input.name,
          description: input.description,
          scheduleId: schedule.id,
          periods: [],
        }));
        expect(created_variant.id).toBeDefined();
        expect(fetched_schedule?.variants).toHaveLength(1);
        expect(fetched_schedule?.variants[0].id).toBe(created_variant.id);
      });
    });
  });
});