import type { PrismaClient } from "@repo/db";
import type {
  BellSchedule,
  CreateCompleteScheduleInput,
} from "../../rbv.types";
import { inject, injectable } from "inversify";
import { RBVHelper } from "../../rbv_helper";

@injectable()
export class BellScheduleBuilder {
  private schedule: BellSchedule;
  private prisma: PrismaClient;
  private rbv_helper: RBVHelper;

  constructor(
    @inject("RBVHelper") rbv_helper: RBVHelper,
    schedule: BellSchedule,
    prisma: PrismaClient,
  ) {
    this.schedule = schedule;
    this.prisma = prisma;
    this.rbv_helper = rbv_helper;
  }

  async build(): Promise<BellSchedule> {
    // Transform the BellSchedule into CreateCompleteScheduleInput format
    const createInput: CreateCompleteScheduleInput = {
      id: this.schedule.id,
      name: this.schedule.name,
      description: this.schedule.description ?? undefined,
      activeDaysOfWeek: this.schedule.activeDaysOfWeek,

      // Transform days
      days: this.schedule.days.map((day) => ({
        id: day.id,
        name: day.name,
        description: day.description ?? undefined,
        groupIds: day.groups.map((group) => group.id),
      })),

      // Transform variants with their time slots
      variants: this.schedule.variants.map((variant) => ({
        id: variant.id,
        name: variant.name,
        description: variant.description ?? undefined,
        timeSlots: variant.timeSlots.map((slot) => ({
          id: slot.id,
          name: slot.name,
          start: slot.start,
          end: slot.end,
        })),
      })),

      // Transform groups
      groups: this.schedule.groups.map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description ?? undefined,
      })),

      // Transform day label rule set if it exists
      dayLabelRuleSet: this.schedule.dayLabelRuleSet
        ? {
            id: this.schedule.dayLabelRuleSet.id,
            name: this.schedule.dayLabelRuleSet.name,
            type: this.schedule.dayLabelRuleSet.type,
            description: this.schedule.dayLabelRuleSet.description ?? undefined,
            seedDate: this.schedule.dayLabelRuleSet.seedDate ?? undefined,

            // Transform day of week rules - map IDs to names for the aggregate API
            dayOfWeekRules: this.schedule.dayLabelRuleSet.dayOfWeekRules?.map(
              (rule) => {
                const day = this.schedule.days.find(
                  (d) => d.id === rule.scheduleDayId,
                );
                if (!day) throw new Error(`Day not found for rule: ${rule.id}`);
                return {
                  id: rule.id,
                  dayOfWeek: rule.dayOfWeek,
                  scheduleDayName: day.name,
                };
              },
            ),

            // Transform pattern based rules - map IDs to names for the aggregate API
            patternBasedRules:
              this.schedule.dayLabelRuleSet.patternBasedRules?.map((rule) => {
                const day = this.schedule.days.find(
                  (d) => d.id === rule.scheduleDayId,
                );
                if (!day) throw new Error(`Day not found for rule: ${rule.id}`);
                return {
                  id: rule.id,
                  patternPosition: rule.patternPosition,
                  scheduleDayName: day.name,
                };
              }),
          }
        : undefined,

      // Transform variant rule set if it exists
      variantRuleSet: this.schedule.variantRuleSet
        ? {
            id: this.schedule.variantRuleSet.id,
            name: this.schedule.variantRuleSet.name,
            description: this.schedule.variantRuleSet.description ?? undefined,

            // Map default variant ID to name for the aggregate API
            defaultVariantName: (() => {
              const defaultVariant = this.schedule.variants.find(
                (v) => v.id === this.schedule.variantRuleSet!.defaultVariantId,
              );
              if (!defaultVariant) throw new Error("Default variant not found");
              return defaultVariant.name;
            })(),

            // Transform exception rules - map variant IDs to names
            exceptions: this.schedule.variantRuleSet.exceptions.map(
              (exception) => {
                const variant = this.schedule.variants.find(
                  (v) => v.id === exception.variantId,
                );
                if (!variant)
                  throw new Error(
                    `Variant not found for exception: ${exception.id}`,
                  );
                return {
                  id: exception.id,
                  date: exception.date,
                  variantName: variant.name,
                };
              },
            ),
          }
        : undefined,
    };

    // Use the aggregate method to create the complete schedule
    const result = await this.rbv_helper.createCompleteSchedule(createInput);
    if (!result.success) {
      throw new Error(result.message);
    }

    return result.data;
  }
}
