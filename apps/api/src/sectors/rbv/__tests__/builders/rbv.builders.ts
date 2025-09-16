import { PrismaClient } from '@repo/db'
import {
  BellSchedule,
  BellScheduleDay,
  BellScheduleVariant,
  TimeSlot,
  DayRecurrenceRuleSet,
} from '../../rbv.types'
import { DayOfWeekRule, PatternBasedRule } from '@repo/db'

export class BellScheduleBuilder {
  private schedule: BellSchedule
  private prisma: PrismaClient
  private createdScheduleDayIds: Map<string, string> = new Map() // Map original ID to created ID

  constructor(schedule: BellSchedule, prisma: PrismaClient) {
    this.schedule = schedule
    this.prisma = prisma
  }

  async build() {
    // 1. Insert the main schedule
    const scheduleRes = await this.prisma.bellSchedule.create({
      data: {
        name: this.schedule.name,
        description: this.schedule.description,
        activeDaysOfWeek: this.schedule.activeDaysOfWeek,
      },
    })

    // 2. Insert time slots for the schedule
    await this.buildTimeSlots(scheduleRes.id)

    // 3. Insert the schedule days first (they need to exist before rules can reference them)
    await this.buildScheduleDays(scheduleRes.id)

    // 4. Insert the recurrence rule set if it exists (after days are created)
    if (this.schedule.recurrenceRuleSet) {
      await this.buildRecurrenceRuleSet(scheduleRes.id)
    }

    return scheduleRes
  }

  private async buildTimeSlots(scheduleId: string) {
    if (this.schedule.timeSlots.length === 0) return

    const timeSlotsData = this.schedule.timeSlots.map(timeSlot => ({
      name: timeSlot.name,
      start: timeSlot.start,
      end: timeSlot.end,
      scheduleId: scheduleId,
    }))

    await this.prisma.timeSlot.createMany({
      data: timeSlotsData,
    })
  }

  private async buildScheduleDays(scheduleId: string) {
    for (const day of this.schedule.days) {
      // Create the schedule day
      const scheduleDayRes = await this.prisma.bellScheduleDay.create({
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
        await this.buildVariants(day.variants, scheduleDayRes.id)
      }

      // Create time slots for this day and connect them
      if (day.timeSlots.length > 0) {
        await this.buildDayTimeSlots(day.timeSlots, scheduleDayRes.id, scheduleId)
      }
    }
  }

  private async buildRecurrenceRuleSet(scheduleId: string): Promise<string> {
    if (!this.schedule.recurrenceRuleSet) throw new Error('No recurrence rule set provided')

    const ruleSet = this.schedule.recurrenceRuleSet
    const ruleSetRes = await this.prisma.dayRecurrenceRuleSet.create({
      data: {
        type: ruleSet.type,
        seedDate: ruleSet.seedDate,
        scheduleId: scheduleId,
      },
    })

    // Create day of week rules if they exist
    if (ruleSet.dayOfWeekRules && ruleSet.dayOfWeekRules.length > 0) {
      await this.buildDayOfWeekRules(ruleSet.dayOfWeekRules, ruleSetRes.id)
    }

    // Create pattern based rules if they exist
    if (ruleSet.patternBasedRules && ruleSet.patternBasedRules.length > 0) {
      await this.buildPatternBasedRules(ruleSet.patternBasedRules, ruleSetRes.id)
    }

    return ruleSetRes.id
  }

  private async buildVariants(variants: BellScheduleVariant[], scheduleDayId: string) {
    const variantsData = variants.map(variant => ({
      name: variant.name,
      description: variant.description,
      recurrenceRuleSet: variant.recurrenceRuleSet,
      scheduleDayId: scheduleDayId,
    }))

    await this.prisma.bellScheduleVariant.createMany({
      data: variantsData,
    })
  }

  private async buildDayTimeSlots(
    timeSlots: TimeSlot[],
    scheduleDayId: string,
    scheduleId: string
  ) {
    // Create time slots for this specific day
    const timeSlotsData = timeSlots.map(timeSlot => ({
      name: timeSlot.name,
      start: timeSlot.start,
      end: timeSlot.end,
      scheduleId: scheduleId,
    }))

    const createdTimeSlots = await this.prisma.timeSlot.createManyAndReturn({
      data: timeSlotsData,
    })

    // Connect the time slots to the schedule day using the many-to-many relationship
    await this.prisma.bellScheduleDay.update({
      where: { id: scheduleDayId },
      data: {
        timeSlots: {
          connect: createdTimeSlots.map(ts => ({ id: ts.id })),
        },
      },
    })
  }

  private async buildDayOfWeekRules(rules: DayOfWeekRule[], ruleSetId: string) {
    const rulesData = rules.map(rule => {
      // Map the original schedule day ID to the created one
      const scheduleDayId = this.createdScheduleDayIds.get(rule.scheduleDayId) || rule.scheduleDayId

      return {
        dayOfWeek: rule.dayOfWeek,
        scheduleDayId: scheduleDayId,
        ruleSetId: ruleSetId,
      }
    })

    await this.prisma.dayOfWeekRule.createMany({
      data: rulesData,
    })
  }

  private async buildPatternBasedRules(rules: PatternBasedRule[], ruleSetId: string) {
    const rulesData = rules.map(rule => {
      // Map the original schedule day ID to the created one
      const scheduleDayId = this.createdScheduleDayIds.get(rule.scheduleDayId) || rule.scheduleDayId

      return {
        patternPosition: rule.patternPosition,
        scheduleDayId: scheduleDayId,
        ruleSetId: ruleSetId,
      }
    })

    await this.prisma.patternBasedRule.createMany({
      data: rulesData,
    })
  }
}
