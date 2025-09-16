import { DataResponse, ID, StatusResponse } from './base.types'
import { inject, injectable } from 'inversify'
import {
    BellSchedule,
    BellScheduleVariant,
    UpsertBellScheduleVariantInput,
    DeleteBellScheduleInput,
    UpsertBellScheduleInput,
} from './rbv.types'
import { Guid } from 'guid-typescript'
import { type ILogger } from '@hipponot/soa-logger'

import { prisma } from '@repo/db'

export const BELL_SCHEDULE_COLLECTION = 'bell_schedules'
export const BELL_SCHEDULE_VARIANT_COLLECTION = 'bell_schedule_variants'
export const PERIOD_COLLECTION = 'periods'

@injectable()
export class RBVHelper {
    private log: ILogger

    constructor(@inject('ILogger') log: ILogger) {
        this.log = log
    }

    public async upsert_schedule(
        input: UpsertBellScheduleInput
    ): Promise<DataResponse<BellSchedule>> {
        const schedule = await prisma.bellSchedule.upsert({
            where: { id: input.id ?? Guid.raw() },
            update: input,
            create: input,
            include: {
                days: {
                    include: {
                        variants: true,
                        timeSlots: true,
                        dayOfWeekRules: true,
                        patternBasedRules: true,
                    },
                },
                timeSlots: true,
                recurrenceRuleSet: true,
            },
        })
        /* istanbul ignore if */
        if (!schedule) {
            const msg = 'Failed to upsert bell schedule'
            this.log.error(msg)
            return { success: false, message: msg }
        }
        return { success: true, data: schedule }
    }

    public async get_schedule(id: ID): Promise<DataResponse<BellSchedule>> {
        const schedule = await prisma.bellSchedule.findUnique({
            where: { id },
            include: {
                days: {
                    include: {
                        variants: true,
                        timeSlots: true,
                        dayOfWeekRules: true,
                        patternBasedRules: true,
                    },
                },
                timeSlots: true,
                recurrenceRuleSet: true,
            },
        })
        if (!schedule) {
            const msg = 'Requested bell schedule not found'
            this.log.error(msg)
            return { success: false, message: msg }
        }
        return { success: true, data: schedule }
    }

    public async delete_schedule(input: DeleteBellScheduleInput): Promise<StatusResponse> {
        const res = await prisma.bellSchedule.delete({ where: { id: input.id } })
        /* istanbul ignore if */
        if (!res) {
            this.log.error(`Failed to delete bell schedule`)
            return { success: false, message: 'Failed to delete bell schedule' }
        }
        return { success: true }
    }

    public async upsert_variant(
        input: UpsertBellScheduleVariantInput
    ): Promise<DataResponse<BellScheduleVariant>> {
        const variant = await prisma.bellScheduleVariant.upsert({
            where: { id: input.id ?? Guid.raw() },
            update: input,
            create: input,
        })
        /* istanbul ignore if */
        if (!variant) {
            const msg = 'Failed to upsert bell schedule variant'
            this.log.error(msg)
            return { success: false, message: msg }
        }

        return { success: true, data: variant }
    }
}
