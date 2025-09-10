import { Collection, Db } from 'mongodb';
import { DataResponse, ID, StatusResponse } from '../base.types';
import { BellSchedule, BellScheduleDB, BellScheduleVariant, CreateBellScheduleVariantInput, DeleteBellScheduleInput, UpsertBellScheduleInput } from './rbv.types';
import { Guid } from 'guid-typescript';
import { log } from '../../core/helpers/logger_helper';
import { remove_null_undefined } from '../../core/helpers/object_helper';

import { PrismaClient } from './generated/prisma';

export const BELL_SCHEDULE_COLLECTION = 'bell_schedules';
export const BELL_SCHEDULE_VARIANT_COLLECTION = 'bell_schedule_variants';
export const PERIOD_COLLECTION = 'periods';

export class RBVHelper {
  private compass_db: Db;
  private bell_schedule_coll: Collection<BellScheduleDB>;

  constructor(compass_db: Db) {
    this.compass_db = compass_db;
    this.bell_schedule_coll = this.compass_db.collection<BellScheduleDB>(BELL_SCHEDULE_COLLECTION);
  }

  public async get_schedule(id: ID): Promise<DataResponse<BellSchedule>> {
    const schedule = await this.bell_schedule_coll.aggregate<BellSchedule>([
      { $match: { id } },
      { $lookup: { from: BELL_SCHEDULE_VARIANT_COLLECTION, localField: 'variant_ids', foreignField: 'id', as: 'variants' } },
      { $unwind: '$variants' },
      { $lookup: { from: PERIOD_COLLECTION, localField: 'variants.period_ids', foreignField: 'id', as: 'variants.periods' } },
      { $unwind: '$variants.periods' },
    ]).toArray();
    if (schedule.length !== 1) {
      const msg = schedule.length === 0 ? 'Requested bell schedule not found' : 'Multiple bell schedules found for id';
      log.error(msg);
      return { success: false, message: msg };
    }
    return { success: true, data: schedule[0] };
  }

  public async upsert_schedule(input: UpsertBellScheduleInput): Promise<DataResponse<BellSchedule>> {
    let existing_schedule: BellSchedule | null = null;
    if (input.id) {
      existing_schedule = await this.bell_schedule_coll.findOne({ id: input.id });
    }

    // Form the bell schedule with empty variants
    const schedule: BellSchedule = {
      id: Guid.raw(),
      variants: [],
      ...existing_schedule,
      ...remove_null_undefined<UpsertBellScheduleInput>(input),
    };

    const schedule_res = await this.bell_schedule_coll.updateOne(
      { id: schedule.id },
      { $set: schedule },
      { upsert: true },
    );
    /* istanbul ignore if */
    if (!schedule_res.acknowledged) {
      log.error(`Failed to upsert bell schedule: ${JSON.stringify(schedule_res)}`);
      return { success: false, message: 'Failed to upsert bell schedule' };
    }
    return { success: true, data: schedule };
  }

  public async delete_schedule(input: DeleteBellScheduleInput): Promise<StatusResponse> {
    const res = await this.bell_schedule_coll.deleteOne({ id: input.id });
    /* istanbul ignore if */
    if (!res.acknowledged) {
      log.error(`Failed to delete bell schedule: ${JSON.stringify(res)}`);
      return { success: false, message: 'Failed to delete bell schedule' };
    }
    return { success: true };
  }

  public async create_variant(input: CreateBellScheduleVariantInput): Promise<DataResponse<BellScheduleVariant>> {
    const { schedule_id, ...variant_input } = input;

    const variant: BellScheduleVariant = {
      id: Guid.raw(),
      ...variant_input,
      periods: [],
    };

    const res = await this.bell_schedule_coll.updateOne(
      { id: schedule_id },
      { $push: { variants: variant } },
    );
    /* istanbul ignore if */
    if (!res.acknowledged) {
      log.error(`Failed to create bell schedule variant: ${JSON.stringify(res)}`);
      return { success: false, message: 'Failed to create bell schedule variant' };
    }

    return { success: true, data: variant };
  }
}
