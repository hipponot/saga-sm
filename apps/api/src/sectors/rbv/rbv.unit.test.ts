// cms.unit.test.ts
import { launch_memory_server } from '../test_helper';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Collection, Db, MongoClient, ObjectId } from 'mongodb';
import { BELL_SCHEDULE_COLLECTION, RBVHelper } from '../../sectors/rbv_prototype/rbv_helper';
import { BellScheduleFactory, CreateBellScheduleVariantInputFactory, UpsertBellScheduleInputFactory } from './rbv_builders';
import { faker } from '@faker-js/faker/.';
import { BellSchedule } from '../../sectors/rbv_prototype/rbv.types';

let memory_mongo: MongoMemoryServer;
let db: Db;
let client: MongoClient;
let rbv_helper: RBVHelper;

beforeAll(async () => {
  ({ memory_mongo, db, client } = await launch_memory_server());
  rbv_helper = new RBVHelper(db);
});

afterAll(async () => {
  await db.dropDatabase();
  await client.close();
  await memory_mongo.stop();
});

beforeEach(async () => {
  const collections = await db.listCollections().toArray();
  for (const { name } of collections) {
    await db.collection(name).drop();
  }
});

jest.setTimeout(30000);
describe('RBVHelper', () => {
  let schedule_collection: Collection<BellSchedule>;
  beforeEach(() => {
    schedule_collection = db.collection(BELL_SCHEDULE_COLLECTION);
  });

  describe('Bell Schedule CRUD', () => {
    describe('Bell Schedule Retrieval', () => {
      it('retrieves a bell schedule by id', async () => {
        // ARRANGE
        const schedule = BellScheduleFactory.build();
        await schedule_collection.insertOne(schedule);

        // ACT
        const res = await rbv_helper.get_schedule(schedule.id);
        if (!res.success) throw new Error(res.message);
        const retrieved_schedule = res.data;

        // ASSERT
        expect(retrieved_schedule).toEqual({ ...schedule, _id: expect.any(ObjectId) as ObjectId });
      });

      it('returns an error if the bell schedule does not exist', async () => {
        // ARRANGE
        // ACT
        const res = await rbv_helper.get_schedule('123');

        // ASSERT
        expect(res.success).toBe(false);
      });
    });

    describe('Bell Schedule Creation & Update', () => {
      it.each(['with', 'without'] as const)('creates a bell schedule %s specifying an id', async (with_id) => {
        // ARRANGE
        const input = UpsertBellScheduleInputFactory.build({
          id: with_id === 'with' ? undefined : faker.string.uuid(),
        });

        // ACT
        const res = await rbv_helper.upsert_schedule(input);
        if (!res.success) throw new Error(res.message);
        const created_schedule = res.data;

        // ASSERT
        expect(created_schedule).toEqual({
          ...input,
          id: input.id ?? expect.any(String) as string,
          variants: [],
        });
      });

      it('Updates an existing bell schedule without modifying the variants', async () => {
        // ARRANGE
        const schedule = BellScheduleFactory.build();
        await schedule_collection.insertOne(schedule);

        // ACT
        const res = await rbv_helper.upsert_schedule({
          ...schedule,
          name: 'New Name',
        });
        if (!res.success) throw new Error(res.message);
        const returned_schedule = res.data;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const fetched_schedule = (await schedule_collection.findOne({ id: schedule.id }))!;

        // ASSERT
        expect(returned_schedule).toEqual({ ...schedule, name: 'New Name' });
        expect(fetched_schedule).toEqual({ ...schedule, name: 'New Name' });
      });
    });

    describe('Bell Schedule Deletion', () => {
      it('deletes a bell schedule by id', async () => {
        // ARRANGE
        const schedule = BellScheduleFactory.build();
        await schedule_collection.insertOne(schedule);

        // ACT
        const res = await rbv_helper.delete_schedule({ id: schedule.id });
        if (!res.success) throw new Error(res.message);

        // ASSERT
        const fetched_schedule = await schedule_collection.findOne({ id: schedule.id });
        expect(fetched_schedule).toBeNull();
      });
    });
  });

  describe('Bell Schedule Variant CUD', () => {
    let schedule: BellSchedule;

    beforeEach(async () => {
      schedule = BellScheduleFactory.build();
      await schedule_collection.insertOne(schedule);
    });

    describe('Bell Schedule Variant Creation', () => {
      it('Adds a new variant to a bell schedule', async () => {
        // ARRANGE
        const input = CreateBellScheduleVariantInputFactory.build({
          schedule_id: schedule.id,
        });

        // ACT
        const res = await rbv_helper.create_variant(input);
        if (!res.success) throw new Error(res.message);
        const created_variant = res.data;
        const fetched_schedule = await schedule_collection.findOne({ id: schedule.id });
        if (!fetched_schedule) throw new Error('Failed to fetch schedule');

        // ASSERT
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { schedule_id, ...variant_input } = input;
        expect(created_variant).toEqual({ ...variant_input, id: expect.any(String) as string });
        expect(fetched_schedule.variants.find((v) => v.id === created_variant.id)).toEqual(created_variant);
      });
    });
  });
});