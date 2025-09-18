import type { PrismaClient } from '@repo/db';
import type {
  BellSchedule,
} from '../../rbv.types';
import { DayOfWeekRule, PatternBasedRule } from '@repo/db';
import { inject, injectable } from 'inversify';
import { RBVHelper } from '../../rbv_helper';

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>;

@injectable()
export class BellScheduleBuilder {
  private schedule: BellSchedule;
  private prisma: PrismaClient;
  private createdScheduleDayIds: Map<string, string> = new Map(); // Map original ID to created ID
  private rbv_helper: RBVHelper;

  constructor(@inject('RBVHelper') rbv_helper: RBVHelper, schedule: BellSchedule, prisma: PrismaClient) {
    this.schedule = schedule;
    this.prisma = prisma;
    this.rbv_helper = rbv_helper;
  }

  async build() {
    // 1. Create the main schedule
    const schedule_res = await this.rbv_helper.upsert_schedule({
      id: this.schedule.id,
      name: this.schedule.name,
      description: this.schedule.description,
      activeDaysOfWeek: this.schedule.activeDaysOfWeek,
    });
    if (!schedule_res.success) throw new Error(schedule_res.message);

    // 2. Create schedule days (before groups, as groups may reference days)
    await this.buildScheduleDays(schedule_res.data.id);

    // 3. Create schedule groups (after schedule exists)
    await this.buildScheduleGroups(schedule_res.data.id);

    // 4. Create variants
    await this.buildVariants(schedule_res.data.id);

    // 5. Create day label rule set if it exists
    if (this.schedule.dayLabelRuleSet) {
      await this.buildDayLabelRuleSet(schedule_res.data.id);
    }

    // 6. Create variant rule set if it exists
    if (this.schedule.variantRuleSet) {
      await this.buildVariantRuleSet(schedule_res.data.id);
    }

    return schedule_res.data;
  }

  private async buildScheduleGroups(scheduleId: string) {
    for (const group of this.schedule.groups) {
      const group_res = await this.rbv_helper.upsert_schedule_group({
        id: group.id,
        name: group.name,
        description: group.description,
        scheduleId: scheduleId,
      });
      if (!group_res.success) throw new Error(group_res.message);
    }
  }

  private async buildScheduleDays(scheduleId: string) {
    for (const day of this.schedule.days) {
      const day_res = await this.rbv_helper.upsert_schedule_day({
        id: day.id,
        name: day.name,
        description: day.description,
        scheduleId: scheduleId,
      });
      if (!day_res.success) throw new Error(day_res.message);

      // Store the mapping from original ID to created ID for rule references
      if (day.id) {
        this.createdScheduleDayIds.set(day.id, day_res.data.id);
      }
    }
  }

  private async buildVariants(scheduleId: string) {
    for (const variant of this.schedule.variants) {
      const variant_res = await this.rbv_helper.upsert_variant({
        id: variant.id,
        name: variant.name,
        description: variant.description,
        scheduleId: scheduleId,
      });
      if (!variant_res.success) throw new Error(variant_res.message);

      // Create time slots for this variant
      for (const timeSlot of variant.timeSlots) {
        const time_slot_res = await this.rbv_helper.upsert_time_slot({
          id: timeSlot.id,
          name: timeSlot.name,
          start: timeSlot.start,
          end: timeSlot.end,
          variantId: variant_res.data.id,
        });
        if (!time_slot_res.success) throw new Error(time_slot_res.message);
      }
    }
  }

  private async buildDayLabelRuleSet(scheduleId: string) {
    if (!this.schedule.dayLabelRuleSet) throw new Error('No day label rule set provided');

    const ruleSet = this.schedule.dayLabelRuleSet;
    const rule_set_res = await this.rbv_helper.upsert_day_label_rule_set({
      id: ruleSet.id,
      name: ruleSet.name,
      type: ruleSet.type,
      description: ruleSet.description,
      seedDate: ruleSet.seedDate,
      scheduleId: scheduleId,
    });
    if (!rule_set_res.success) throw new Error(rule_set_res.message);

    // Create day of week rules if they exist
    if (ruleSet.dayOfWeekRules && ruleSet.dayOfWeekRules.length > 0) {
      await this.buildDayOfWeekRules(ruleSet.dayOfWeekRules, rule_set_res.data.id);
    }

    // Create pattern based rules if they exist
    if (ruleSet.patternBasedRules && ruleSet.patternBasedRules.length > 0) {
      await this.buildPatternBasedRules(ruleSet.patternBasedRules, rule_set_res.data.id);
    }
  }

  private async buildVariantRuleSet(scheduleId: string) {
    if (!this.schedule.variantRuleSet) throw new Error('No variant rule set provided');

    const ruleSet = this.schedule.variantRuleSet;
    const rule_set_res = await this.rbv_helper.upsert_variant_rule_set({
      id: ruleSet.id,
      name: ruleSet.name,
      description: ruleSet.description,
      defaultVariantId: ruleSet.defaultVariantId,
      scheduleId: scheduleId,
    });
    if (!rule_set_res.success) throw new Error(rule_set_res.message);

    // Create exception rules if they exist
    if (ruleSet.exceptions && ruleSet.exceptions.length > 0) {
      for (const exception of ruleSet.exceptions) {
        const exception_res = await this.rbv_helper.upsert_exception_based_rule({
          id: exception.id,
          date: exception.date,
          variantId: exception.variantId,
          variantRuleSetId: rule_set_res.data.id,
        });
        if (!exception_res.success) throw new Error(exception_res.message);
      }
    }
  }

  private async buildDayOfWeekRules(
    rules: DayOfWeekRule[],
    ruleSetId: string
  ) {
    for (const rule of rules) {
      // Map the original schedule day ID to the created one
      const scheduleDayId =
        this.createdScheduleDayIds.get(rule.scheduleDayId) || rule.scheduleDayId;

      const rule_res = await this.rbv_helper.upsert_day_of_week_rule({
        id: rule.id,
        dayOfWeek: rule.dayOfWeek,
        scheduleDayId: scheduleDayId,
        ruleSetId: ruleSetId,
        scheduleId: this.schedule.id,
      });
      if (!rule_res.success) throw new Error(rule_res.message);
    }
  }

  private async buildPatternBasedRules(
    rules: PatternBasedRule[],
    ruleSetId: string
  ) {
    for (const rule of rules) {
      // Map the original schedule day ID to the created one
      const scheduleDayId =
        this.createdScheduleDayIds.get(rule.scheduleDayId) || rule.scheduleDayId;

      const rule_res = await this.rbv_helper.upsert_pattern_based_rule({
        id: rule.id,
        patternPosition: rule.patternPosition,
        scheduleDayId: scheduleDayId,
        ruleSetId: ruleSetId,
        scheduleId: this.schedule.id,
      });
      if (!rule_res.success) throw new Error(rule_res.message);
    }
  }
}
