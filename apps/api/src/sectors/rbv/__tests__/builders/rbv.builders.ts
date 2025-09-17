import { PrismaClient } from '@repo/db'
import {
  BellSchedule,
  BellScheduleDay,
  BellScheduleVariant,
  TimeSlot,
  DayRecurrenceRuleSet,
} from '../../rbv.types'
import { DayOfWeekRule, PatternBasedRule } from '@repo/db'

type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>

export class BellScheduleBuilder {
  private schedule: BellSchedule
  private prisma: PrismaClient
  private createdScheduleDayIds: Map<string, string> = new Map() // Map original ID to created ID

  constructor(schedule: BellSchedule, prisma: PrismaClient) {
    this.schedule = schedule
    this.prisma = prisma
  }

  async build() {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Insert the main schedule
      const scheduleRes = await tx.bellSchedule.create({
        data: {
          id: this.schedule.id, // Use the existing ID if provided
          name: this.schedule.name,
          description: this.schedule.description,
          activeDaysOfWeek: this.schedule.activeDaysOfWeek,
        },
      })

      // 2. Insert time slots for the schedule
      await this.buildTimeSlots(scheduleRes.id, tx)

      // 3. Insert the schedule days first (they need to exist before rules can reference them)
      await this.buildScheduleDays(scheduleRes.id, tx)

      // 4. Insert the recurrence rule set if it exists (after days are created)
      if (this.schedule.recurrenceRuleSet) {
        await this.buildRecurrenceRuleSet(scheduleRes.id, tx)
      }

      return scheduleRes
    })
  }

  private async buildTimeSlots(scheduleId: string, tx: TransactionClient) {
    if (this.schedule.timeSlots.length === 0) return

    const timeSlotsData = this.schedule.timeSlots.map(timeSlot => ({
      name: timeSlot.name,
      start: timeSlot.start,
      end: timeSlot.end,
      scheduleId: scheduleId,
    }))

    await tx.timeSlot.createMany({
      data: timeSlotsData,
    })
  }

  private async buildScheduleDays(scheduleId: string, tx: TransactionClient) {
    for (const day of this.schedule.days) {
      // Create the schedule day
      const scheduleDayRes = await tx.bellScheduleDay.create({
        data: {
          name: day.name,
          description: day.description,
          scheduleId: scheduleId,
        },
      })

      // Store the mapping from original ID to created ID for rule references
      if (day.id) {
        this.createdScheduleDayIds.set(day.id, scheduleDayRes.id)
      }

      // Create variants for this day
      if (day.variants.length > 0) {
        await this.buildVariants(day.variants, scheduleDayRes.id, tx)
      }

      // Create time slots for this day and connect them
      if (day.timeSlots.length > 0) {
        await this.buildDayTimeSlots(day.timeSlots, scheduleDayRes.id, scheduleId, tx)
      }
    }
  }

  private async buildRecurrenceRuleSet(scheduleId: string, tx: TransactionClient): Promise<string> {
    if (!this.schedule.recurrenceRuleSet) throw new Error('No recurrence rule set provided')

    const ruleSet = this.schedule.recurrenceRuleSet
    const ruleSetRes = await tx.dayRecurrenceRuleSet.create({
      data: {
        type: ruleSet.type,
        seedDate: ruleSet.seedDate,
        scheduleId: scheduleId,
      },
    })

    // Create day of week rules if they exist
    if (ruleSet.dayOfWeekRules && ruleSet.dayOfWeekRules.length > 0) {
      await this.buildDayOfWeekRules(ruleSet.dayOfWeekRules, ruleSetRes.id, tx)
    }

    // Create pattern based rules if they exist
    if (ruleSet.patternBasedRules && ruleSet.patternBasedRules.length > 0) {
      await this.buildPatternBasedRules(ruleSet.patternBasedRules, ruleSetRes.id, tx)
    }

    return ruleSetRes.id
  }

  private async buildVariants(variants: BellScheduleVariant[], scheduleDayId: string, tx: TransactionClient) {
    const variantsData = variants.map(variant => ({
      name: variant.name,
      description: variant.description,
      recurrenceRuleSet: variant.recurrenceRuleSet,
      scheduleDayId: scheduleDayId,
    }))

    await tx.bellScheduleVariant.createMany({
      data: variantsData,
    })
  }

  private async buildDayTimeSlots(
    timeSlots: TimeSlot[],
    scheduleDayId: string,
    scheduleId: string,
    tx: TransactionClient
  ) {
    // Create time slots for this specific day
    const timeSlotsData = timeSlots.map(timeSlot => ({
      name: timeSlot.name,
      start: timeSlot.start,
      end: timeSlot.end,
      scheduleId: scheduleId,
    }))

    const createdTimeSlots = await tx.timeSlot.createManyAndReturn({
      data: timeSlotsData,
    })

    // Connect the time slots to the schedule day using the many-to-many relationship
    await tx.bellScheduleDay.update({
      where: { id: scheduleDayId },
      data: {
        timeSlots: {
          connect: createdTimeSlots.map(ts => ({ id: ts.id })),
        },
      },
    })
  }

  private async buildDayOfWeekRules(rules: DayOfWeekRule[], ruleSetId: string, tx: TransactionClient) {
    const rulesData = rules.map(rule => {
      // Map the original schedule day ID to the created one
      const scheduleDayId = this.createdScheduleDayIds.get(rule.scheduleDayId) || rule.scheduleDayId

      return {
        dayOfWeek: rule.dayOfWeek,
        scheduleDayId: scheduleDayId,
        ruleSetId: ruleSetId,
      }
    })

    await tx.dayOfWeekRule.createMany({
      data: rulesData,
    })
  }

  private async buildPatternBasedRules(rules: PatternBasedRule[], ruleSetId: string, tx: TransactionClient) {
    const rulesData = rules.map(rule => {
      // Map the original schedule day ID to the created one
      const scheduleDayId = this.createdScheduleDayIds.get(rule.scheduleDayId) || rule.scheduleDayId

      return {
        patternPosition: rule.patternPosition,
        scheduleDayId: scheduleDayId,
        ruleSetId: ruleSetId,
      }
    })

    await tx.patternBasedRule.createMany({
      data: rulesData,
    })
  }
}
