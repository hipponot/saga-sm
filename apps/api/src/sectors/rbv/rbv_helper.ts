import { DataResponse, ID, StatusResponse } from './base.types.js'
import { inject, injectable } from 'inversify'
import {
    BellSchedule,
    BellScheduleVariant,
    UpsertBellScheduleVariantInput,
    DeleteBellScheduleInput,
    UpsertBellScheduleInput,
    CalculateMeetingTimesInput,
    MeetingTimes,
} from './rbv.types.js'
import { Guid } from 'guid-typescript'
import { type ILogger } from '@hipponot/logger'

import { DayOfWeekRule, PatternBasedRule, prisma, RecurrenceRuleType } from '@repo/db'
import { ChronoUnit, LocalDate } from '@js-joda/core'

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

    public async calculate_meeting_times(input: CalculateMeetingTimesInput): Promise<DataResponse<MeetingTimes>> {
        // 1. Get the schedule
        const schedule = await prisma.bellSchedule.findUnique({
            where: { id: input.scheduleId },
            include: {
                recurrenceRuleSet: {
                    include: {
                        dayOfWeekRules: true,
                        patternBasedRules: true,
                    },
                },
            },
        })
        if (!schedule) {
            return { success: false, message: 'Schedule not found' }
        }
        if (!schedule.recurrenceRuleSet) {
            return { success: false, message: 'Schedule has no recurrence rule set' }
        }

        // 2. Determine which bell schedule days occur on each day of the date range
        const dayMap: Map<LocalDate, string> = new Map(); // Map of date to the scheduleDayId
        let ruleSet: DayOfWeekRule[] | PatternBasedRule[] = [];
        switch (schedule.recurrenceRuleSet.type) {
            case RecurrenceRuleType.DAY_OF_WEEK:
                ruleSet = schedule.recurrenceRuleSet.dayOfWeekRules;
                let date = input.dateRange.start;
                while (!date.isAfter(input.dateRange.end)) {
                    const dayOfWeek = date.dayOfWeek().value();
                    const day = ruleSet.find(d => d.dayOfWeek === dayOfWeek);
                    dayMap.set(date, day?.scheduleDayId ?? '');

                    date = date.plusDays(1);
                }
                break;
            case RecurrenceRuleType.PATTERN_BASED:
                ruleSet = schedule.recurrenceRuleSet.patternBasedRules as PatternBasedRule[];
                if (!schedule.recurrenceRuleSet.seedDate) {
                    return { success: false, message: 'Schedule is pattern-based but has no seed date' }
                }
                let seedDate = LocalDate.parse(schedule.recurrenceRuleSet.seedDate.toISOString());

                // Use the seed date to determine the first index of the pattern for the start date
                let index = ChronoUnit.DAYS.between(seedDate, input.dateRange.start);
                const pattern_length = ruleSet.length;
                while (index <= ChronoUnit.DAYS.between(seedDate, input.dateRange.end)) {
                    const patternIndex = index % pattern_length;
                    const dayId = ruleSet[patternIndex].scheduleDayId;
                    dayMap.set(input.dateRange.start.plusDays(index), dayId);
                    index++;
                }
                break;
        }

        // 3. Determine which variants are active on each day of the date range

        // 4. Combine the active variants with the active days to determine the meeting times

        // 5. Return the meeting times

        return { success: true, data: null as unknown as MeetingTimes }
    }
}
