import { PrismaClient } from '@repo/db';
import {
  BellSchedule,
  BellScheduleVariant,
  DayLabelRuleSet,
} from '../../rbv.types';
import { DayOfWeekRule, PatternBasedRule, BellScheduleDay, TimeSlot } from '@repo/db';

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>;

export class BellScheduleBuilder {
  private schedule: BellSchedule;
  private prisma: PrismaClient;
  private createdScheduleDayIds: Map<string, string> = new Map(); // Map original ID to created ID

  constructor(schedule: BellSchedule, prisma: PrismaClient) {
    this.schedule = schedule;
    this.prisma = prisma;
  }

  async build() {
    return await this.prisma.$transaction(async tx => {
      // 1. Insert the main schedule
      const scheduleRes = await tx.bellSchedule.create({
        data: {
          id: this.schedule.id, // Use the existing ID if provided
          name: this.schedule.name,
          description: this.schedule.description,
          activeDaysOfWeek: this.schedule.activeDaysOfWeek,
        },
      });

      // 2. Insert the schedule days first (they need to exist before rules can reference them)
      await this.buildScheduleDays(scheduleRes.id, tx);

      // 3. Insert the day label rule set if it exists (after days are created)
      if (this.schedule.dayLabelRuleSet) {
        await this.buildDayLabelRuleSet(scheduleRes.id, tx);
      }

      return scheduleRes;
    });
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
      });

      // Store the mapping from original ID to created ID for rule references
      if (day.id) {
        this.createdScheduleDayIds.set(day.id, scheduleDayRes.id);
      }
    }
  }

  private async buildDayLabelRuleSet(scheduleId: string, tx: TransactionClient): Promise<string> {
    if (!this.schedule.dayLabelRuleSet) throw new Error('No day label rule set provided');

    const ruleSet = this.schedule.dayLabelRuleSet;
    const ruleSetRes = await tx.dayLabelRuleSet.create({
      data: {
        name: ruleSet.name,
        type: ruleSet.type,
        description: ruleSet.description,
        seedDate: ruleSet.seedDate,
        scheduleId: scheduleId,
      },
    });

    // Create day of week rules if they exist
    if (ruleSet.dayOfWeekRules && ruleSet.dayOfWeekRules.length > 0) {
      await this.buildDayOfWeekRules(ruleSet.dayOfWeekRules, ruleSetRes.id, tx);
    }

    // Create pattern based rules if they exist
    if (ruleSet.patternBasedRules && ruleSet.patternBasedRules.length > 0) {
      await this.buildPatternBasedRules(ruleSet.patternBasedRules, ruleSetRes.id, tx);
    }

    return ruleSetRes.id;
  }

  private async buildDayOfWeekRules(
    rules: DayOfWeekRule[],
    ruleSetId: string,
    tx: TransactionClient
  ) {
    const rulesData = rules.map(rule => {
      // Map the original schedule day ID to the created one
      const scheduleDayId =
        this.createdScheduleDayIds.get(rule.scheduleDayId) || rule.scheduleDayId;

      return {
        dayOfWeek: rule.dayOfWeek,
        scheduleDayId: scheduleDayId,
        ruleSetId: ruleSetId,
      };
    });

    await tx.dayOfWeekRule.createMany({
      data: rulesData,
    });
  }

  private async buildPatternBasedRules(
    rules: PatternBasedRule[],
    ruleSetId: string,
    tx: TransactionClient
  ) {
    const rulesData = rules.map(rule => {
      // Map the original schedule day ID to the created one
      const scheduleDayId =
        this.createdScheduleDayIds.get(rule.scheduleDayId) || rule.scheduleDayId;

      return {
        patternPosition: rule.patternPosition,
        scheduleDayId: scheduleDayId,
        ruleSetId: ruleSetId,
      };
    });

    await tx.patternBasedRule.createMany({
      data: rulesData,
    });
  }
}
