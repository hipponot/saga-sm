import { DataResponse, ID, StatusResponse } from "./base.types.js";
import { inject, injectable } from "inversify";
import {
  BellSchedule,
  BellScheduleDay,
  BellScheduleVariant,
  DeleteBellScheduleInput,
  CalculateMeetingTimesInput,
  MeetingTimes,
  DayLabelRuleSet,
  VariantRuleSet,
  CreateCompleteScheduleInput,
  UpdateCompleteScheduleInput,
} from "./rbv.types.js";
import { Guid } from "guid-typescript";
import { type ILogger } from "@hipponot/soa-logger";

import {
  BellScheduleGroup,
  DayLabelRecurrenceRuleType,
  DayOfWeekRule,
  PatternBasedRule,
  TimeSlot,
  ExceptionBasedRule,
  prisma,
} from "@repo/db";
import { ChronoUnit, LocalDate, LocalDateTime, LocalTime } from "@js-joda/core";

export const BELL_SCHEDULE_COLLECTION = "bell_schedules";
export const BELL_SCHEDULE_VARIANT_COLLECTION = "bell_schedule_variants";
export const PERIOD_COLLECTION = "periods";

@injectable()
export class RBVHelper {
  private log: ILogger;

  constructor(@inject("ILogger") log: ILogger) {
    this.log = log;
  }

  public async get_schedule(id: ID): Promise<DataResponse<BellSchedule>> {
    const schedule = await prisma.bellSchedule.findUnique({
      where: { id },
      include: {
        days: {
          include: {
            groups: true,
          },
        },
        variants: {
          include: {
            timeSlots: true,
          },
        },
        groups: true,
        dayLabelRuleSet: {
          include: {
            dayOfWeekRules: true,
            patternBasedRules: true,
          },
        },
        variantRuleSet: {
          include: {
            exceptions: true,
          },
        },
      },
    });
    if (!schedule) {
      const msg = "Requested bell schedule not found";
      this.log.error(msg);
      return { success: false, message: msg };
    }
    return { success: true, data: schedule };
  }

  public async delete_schedule(
    input: DeleteBellScheduleInput,
  ): Promise<StatusResponse> {
    try {
      const res = await prisma.bellSchedule.delete({ where: { id: input.id } });
      /* istanbul ignore if */
      if (!res) {
        this.log.error(`Failed to delete bell schedule`);
        return { success: false, message: "Failed to delete bell schedule" };
      }
      return { success: true };
    } catch (error: any) {
      if (error.code === "P2025") {
        // Record not found
        return { success: false, message: "Requested bell schedule not found" };
      }
      this.log.error(`Failed to delete bell schedule: ${error.message}`);
      return { success: false, message: "Failed to delete bell schedule" };
    }
  }

  // ============================================================================
  // AGGREGATE OPERATIONS - For creating/updating complete schedules
  // ============================================================================

  /**
   * Creates a complete bell schedule with all nested entities in a single transaction.
   *
   * Database Optimization Explanation:
   * - Uses Prisma $transaction() to ensure atomicity - if any part fails, all changes are rolled back
   * - Creates entities in the correct dependency order to avoid foreign key constraint violations
   * - Uses name-based references for rules to avoid complex ID mapping during creation
   * - Single transaction reduces database round trips and ensures data consistency
   */
  public async createCompleteSchedule(
    input: CreateCompleteScheduleInput,
  ): Promise<DataResponse<BellSchedule>> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create the main schedule first (other entities depend on it)
        const scheduleId = input.id ?? Guid.raw();
        const schedule = await tx.bellSchedule.create({
          data: {
            id: scheduleId,
            name: input.name,
            description: input.description,
            activeDaysOfWeek: input.activeDaysOfWeek,
          },
        });

        // 2. Create schedule groups first (needed for day-group relationships)
        const createdGroups: Array<{ id: string; name: string }> = [];
        for (const groupInput of input.groups) {
          const group = await tx.bellScheduleGroup.create({
            data: {
              id: groupInput.id ?? Guid.raw(),
              name: groupInput.name,
              description: groupInput.description,
              scheduleId: schedule.id,
            },
          });
          createdGroups.push({ id: group.id, name: group.name });
        }

        // 3. Create schedule days with group associations (needed for rule references)
        const createdDays: Array<{ id: string; name: string }> = [];
        for (const dayInput of input.days) {
          const day = await tx.bellScheduleDay.create({
            data: {
              id: dayInput.id ?? Guid.raw(),
              name: dayInput.name,
              description: dayInput.description,
              scheduleId: schedule.id,
              // Connect to groups if specified
              ...(dayInput.groupIds &&
                dayInput.groupIds.length > 0 && {
                  groups: {
                    connect: dayInput.groupIds.map((groupId) => ({
                      id: groupId,
                    })),
                  },
                }),
            },
          });
          createdDays.push({ id: day.id, name: day.name });
        }

        // 4. Create variants with their time slots
        const createdVariants: Array<{ id: string; name: string }> = [];
        for (const variantInput of input.variants) {
          const variant = await tx.bellScheduleVariant.create({
            data: {
              id: variantInput.id ?? Guid.raw(),
              name: variantInput.name,
              description: variantInput.description,
              scheduleId: schedule.id,
            },
          });
          createdVariants.push({ id: variant.id, name: variant.name });

          // Create time slots for this variant
          for (const timeSlotInput of variantInput.timeSlots) {
            await tx.timeSlot.create({
              data: {
                id: timeSlotInput.id ?? Guid.raw(),
                name: timeSlotInput.name,
                start: timeSlotInput.start,
                end: timeSlotInput.end,
                variantId: variant.id,
              },
            });
          }
        }

        // 5. Create day label rule set if provided
        if (input.dayLabelRuleSet) {
          const ruleSetInput = input.dayLabelRuleSet;
          const dayLabelRuleSet = await tx.dayLabelRuleSet.create({
            data: {
              id: ruleSetInput.id ?? Guid.raw(),
              name: ruleSetInput.name,
              type: ruleSetInput.type,
              description: ruleSetInput.description,
              seedDate: ruleSetInput.seedDate,
              scheduleId: schedule.id,
            },
          });

          // Create day of week rules if provided
          if (ruleSetInput.dayOfWeekRules) {
            for (const ruleInput of ruleSetInput.dayOfWeekRules) {
              const scheduleDayId = createdDays.find(
                (d) => d.name === ruleInput.scheduleDayName,
              )?.id;
              if (!scheduleDayId) {
                throw new Error(
                  `Schedule day with name "${ruleInput.scheduleDayName}" not found`,
                );
              }

              await tx.dayOfWeekRule.create({
                data: {
                  id: ruleInput.id ?? Guid.raw(),
                  dayOfWeek: ruleInput.dayOfWeek,
                  scheduleDayId: scheduleDayId,
                  ruleSetId: dayLabelRuleSet.id,
                  scheduleId: schedule.id,
                },
              });
            }
          }

          // Create pattern based rules if provided
          if (ruleSetInput.patternBasedRules) {
            for (const ruleInput of ruleSetInput.patternBasedRules) {
              const scheduleDayId = createdDays.find(
                (d) => d.name === ruleInput.scheduleDayName,
              )?.id;
              if (!scheduleDayId) {
                throw new Error(
                  `Schedule day with name "${ruleInput.scheduleDayName}" not found`,
                );
              }

              await tx.patternBasedRule.create({
                data: {
                  id: ruleInput.id ?? Guid.raw(),
                  patternPosition: ruleInput.patternPosition,
                  scheduleDayId: scheduleDayId,
                  ruleSetId: dayLabelRuleSet.id,
                  scheduleId: schedule.id,
                },
              });
            }
          }
        }

        // 6. Create variant rule set if provided
        if (input.variantRuleSet) {
          const ruleSetInput = input.variantRuleSet;
          const defaultVariantId = createdVariants.find(
            (v) => v.name === ruleSetInput.defaultVariantName,
          )?.id;
          if (!defaultVariantId) {
            throw new Error(
              `Default variant with name "${ruleSetInput.defaultVariantName}" not found`,
            );
          }

          const variantRuleSet = await tx.variantRuleSet.create({
            data: {
              id: ruleSetInput.id ?? Guid.raw(),
              name: ruleSetInput.name,
              description: ruleSetInput.description,
              defaultVariantId: defaultVariantId,
              scheduleId: schedule.id,
            },
          });

          // Create exception rules
          for (const exceptionInput of ruleSetInput.exceptions) {
            const variantId = createdVariants.find(
              (v) => v.name === exceptionInput.variantName,
            )?.id;
            if (!variantId) {
              throw new Error(
                `Exception variant with name "${exceptionInput.variantName}" not found`,
              );
            }

            await tx.exceptionBasedRule.create({
              data: {
                id: exceptionInput.id ?? Guid.raw(),
                date: exceptionInput.date,
                variantId: variantId,
                variantRuleSetId: variantRuleSet.id,
              },
            });
          }
        }

        return schedule.id;
      });

      // After successful transaction, fetch the complete schedule with all relations
      // This uses our existing optimized get_schedule method
      const schedule_res = await this.get_schedule(result);
      /* istanbul ignore if */
      if (!schedule_res.success) return schedule_res;

      return { success: true, data: schedule_res.data };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      this.log.error(`Failed to create complete schedule: ${errorMessage}`);
      return {
        success: false,
        message: `Failed to create complete schedule: ${errorMessage}`,
      };
    }
  }

  /**
   * Updates a complete bell schedule with all nested entities in a single transaction.
   * Supports creating, updating, and deleting nested entities atomically.
   *
   * Database Optimization Explanation:
   * - Uses a single transaction to ensure all changes are atomic
   * - Handles complex nested entity updates with proper dependency ordering
   * - Uses efficient batch operations where possible (deleteMany, createMany)
   * - For rule sets, replaces entire rule sets rather than trying to diff individual rules
   *   to simplify the logic and reduce complexity
   */
  public async updateCompleteSchedule(
    input: UpdateCompleteScheduleInput,
  ): Promise<DataResponse<BellSchedule>> {
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Update the main schedule properties if provided
        if (
          input.name !== undefined ||
          input.description !== undefined ||
          input.activeDaysOfWeek !== undefined
        ) {
          await tx.bellSchedule.update({
            where: { id: input.id },
            data: {
              ...(input.name !== undefined && { name: input.name }),
              ...(input.description !== undefined && {
                description: input.description,
              }),
              ...(input.activeDaysOfWeek !== undefined && {
                activeDaysOfWeek: input.activeDaysOfWeek,
              }),
            },
          });
        }

        // 2. Handle schedule days updates
        if (input.days) {
          // Delete days if specified
          if (input.days.delete && input.days.delete.length > 0) {
            await tx.bellScheduleDay.deleteMany({
              where: {
                id: { in: input.days.delete },
                scheduleId: input.id, // Security: ensure we only delete days from this schedule
              },
            });
          }

          // Update existing days
          if (input.days.update) {
            for (const dayUpdate of input.days.update) {
              const updateData: any = {
                ...(dayUpdate.name !== undefined && { name: dayUpdate.name }),
                ...(dayUpdate.description !== undefined && {
                  description: dayUpdate.description,
                }),
              };

              // Handle group connections if specified
              if (dayUpdate.groupIds !== undefined) {
                if (dayUpdate.groupIds.length === 0) {
                  // Disconnect from all groups
                  updateData.groups = { set: [] };
                } else {
                  // Connect to specified groups
                  updateData.groups = {
                    set: dayUpdate.groupIds.map((groupId) => ({ id: groupId })),
                  };
                }
              }

              await tx.bellScheduleDay.update({
                where: { id: dayUpdate.id },
                data: updateData,
              });
            }
          }

          // Create new days
          if (input.days.create) {
            for (const dayCreate of input.days.create) {
              await tx.bellScheduleDay.create({
                data: {
                  id: dayCreate.id ?? Guid.raw(),
                  name: dayCreate.name,
                  description: dayCreate.description,
                  scheduleId: input.id,
                  // Connect to groups if specified
                  ...(dayCreate.groupIds &&
                    dayCreate.groupIds.length > 0 && {
                      groups: {
                        connect: dayCreate.groupIds.map((groupId) => ({
                          id: groupId,
                        })),
                      },
                    }),
                },
              });
            }
          }
        }

        // 3. Handle schedule groups updates
        if (input.groups) {
          // Delete groups if specified
          if (input.groups.delete && input.groups.delete.length > 0) {
            await tx.bellScheduleGroup.deleteMany({
              where: {
                id: { in: input.groups.delete },
                scheduleId: input.id,
              },
            });
          }

          // Update existing groups
          if (input.groups.update) {
            for (const groupUpdate of input.groups.update) {
              await tx.bellScheduleGroup.update({
                where: { id: groupUpdate.id },
                data: {
                  ...(groupUpdate.name !== undefined && {
                    name: groupUpdate.name,
                  }),
                  ...(groupUpdate.description !== undefined && {
                    description: groupUpdate.description,
                  }),
                },
              });
            }
          }

          // Create new groups
          if (input.groups.create) {
            for (const groupCreate of input.groups.create) {
              await tx.bellScheduleGroup.create({
                data: {
                  id: groupCreate.id ?? Guid.raw(),
                  name: groupCreate.name,
                  description: groupCreate.description,
                  scheduleId: input.id,
                },
              });
            }
          }
        }

        // 4. Handle variants updates (more complex due to nested time slots)
        if (input.variants) {
          // Delete variants if specified (cascades to time slots)
          if (input.variants.delete && input.variants.delete.length > 0) {
            await tx.bellScheduleVariant.deleteMany({
              where: {
                id: { in: input.variants.delete },
                scheduleId: input.id,
              },
            });
          }

          // Update existing variants
          if (input.variants.update) {
            for (const variantUpdate of input.variants.update) {
              // Update variant properties
              await tx.bellScheduleVariant.update({
                where: { id: variantUpdate.id },
                data: {
                  ...(variantUpdate.name !== undefined && {
                    name: variantUpdate.name,
                  }),
                  ...(variantUpdate.description !== undefined && {
                    description: variantUpdate.description,
                  }),
                },
              });

              // Handle time slot updates for this variant
              if (variantUpdate.timeSlots) {
                // Delete time slots if specified
                if (
                  variantUpdate.timeSlots.delete &&
                  variantUpdate.timeSlots.delete.length > 0
                ) {
                  await tx.timeSlot.deleteMany({
                    where: {
                      id: { in: variantUpdate.timeSlots.delete },
                      variantId: variantUpdate.id,
                    },
                  });
                }

                // Update existing time slots
                if (variantUpdate.timeSlots.update) {
                  for (const timeSlotUpdate of variantUpdate.timeSlots.update) {
                    await tx.timeSlot.update({
                      where: { id: timeSlotUpdate.id },
                      data: {
                        ...(timeSlotUpdate.name !== undefined && {
                          name: timeSlotUpdate.name,
                        }),
                        ...(timeSlotUpdate.start !== undefined && {
                          start: timeSlotUpdate.start,
                        }),
                        ...(timeSlotUpdate.end !== undefined && {
                          end: timeSlotUpdate.end,
                        }),
                      },
                    });
                  }
                }

                // Create new time slots
                if (variantUpdate.timeSlots.create) {
                  for (const timeSlotCreate of variantUpdate.timeSlots.create) {
                    await tx.timeSlot.create({
                      data: {
                        id: timeSlotCreate.id ?? Guid.raw(),
                        name: timeSlotCreate.name,
                        start: timeSlotCreate.start,
                        end: timeSlotCreate.end,
                        variantId: variantUpdate.id,
                      },
                    });
                  }
                }
              }
            }
          }

          // Create new variants
          if (input.variants.create) {
            for (const variantCreate of input.variants.create) {
              const variant = await tx.bellScheduleVariant.create({
                data: {
                  id: variantCreate.id ?? Guid.raw(),
                  name: variantCreate.name,
                  description: variantCreate.description,
                  scheduleId: input.id,
                },
              });

              // Create time slots for new variant
              for (const timeSlotCreate of variantCreate.timeSlots) {
                await tx.timeSlot.create({
                  data: {
                    id: timeSlotCreate.id ?? Guid.raw(),
                    name: timeSlotCreate.name,
                    start: timeSlotCreate.start,
                    end: timeSlotCreate.end,
                    variantId: variant.id,
                  },
                });
              }
            }
          }
        }

        // 5. Handle day label rule set update (replace entire rule set for simplicity)
        if (input.dayLabelRuleSet) {
          // Delete existing rule set and all its rules (cascades)
          await tx.dayLabelRuleSet.deleteMany({
            where: { scheduleId: input.id },
          });

          // Get current days for name resolution
          const currentDays = await tx.bellScheduleDay.findMany({
            where: { scheduleId: input.id },
            select: { id: true, name: true },
          });

          // Create new rule set
          const dayLabelRuleSet = await tx.dayLabelRuleSet.create({
            data: {
              id: input.dayLabelRuleSet.id ?? Guid.raw(),
              name: input.dayLabelRuleSet.name,
              type: input.dayLabelRuleSet.type,
              description: input.dayLabelRuleSet.description,
              seedDate: input.dayLabelRuleSet.seedDate,
              scheduleId: input.id,
            },
          });

          // Create day of week rules if provided
          if (input.dayLabelRuleSet.dayOfWeekRules) {
            for (const ruleInput of input.dayLabelRuleSet.dayOfWeekRules) {
              const scheduleDayId = currentDays.find(
                (d) => d.name === ruleInput.scheduleDayName,
              )?.id;
              if (!scheduleDayId) {
                throw new Error(
                  `Schedule day with name "${ruleInput.scheduleDayName}" not found`,
                );
              }

              await tx.dayOfWeekRule.create({
                data: {
                  id: ruleInput.id ?? Guid.raw(),
                  dayOfWeek: ruleInput.dayOfWeek,
                  scheduleDayId: scheduleDayId,
                  ruleSetId: dayLabelRuleSet.id,
                  scheduleId: input.id,
                },
              });
            }
          }

          // Create pattern based rules if provided
          if (input.dayLabelRuleSet.patternBasedRules) {
            for (const ruleInput of input.dayLabelRuleSet.patternBasedRules) {
              const scheduleDayId = currentDays.find(
                (d) => d.name === ruleInput.scheduleDayName,
              )?.id;
              if (!scheduleDayId) {
                throw new Error(
                  `Schedule day with name "${ruleInput.scheduleDayName}" not found`,
                );
              }

              await tx.patternBasedRule.create({
                data: {
                  id: ruleInput.id ?? Guid.raw(),
                  patternPosition: ruleInput.patternPosition,
                  scheduleDayId: scheduleDayId,
                  ruleSetId: dayLabelRuleSet.id,
                  scheduleId: input.id,
                },
              });
            }
          }
        }

        // 6. Handle variant rule set update (replace entire rule set for simplicity)
        if (input.variantRuleSet) {
          // Delete existing variant rule set and all its rules (cascades)
          await tx.variantRuleSet.deleteMany({
            where: { scheduleId: input.id },
          });

          // Get current variants for name resolution
          const currentVariants = await tx.bellScheduleVariant.findMany({
            where: { scheduleId: input.id },
            select: { id: true, name: true },
          });

          const defaultVariantId = currentVariants.find(
            (v) => v.name === input.variantRuleSet!.defaultVariantName,
          )?.id;
          if (!defaultVariantId) {
            throw new Error(
              `Default variant with name "${input.variantRuleSet.defaultVariantName}" not found`,
            );
          }

          // Create new variant rule set
          const variantRuleSet = await tx.variantRuleSet.create({
            data: {
              id: input.variantRuleSet.id ?? Guid.raw(),
              name: input.variantRuleSet.name,
              description: input.variantRuleSet.description,
              defaultVariantId: defaultVariantId,
              scheduleId: input.id,
            },
          });

          // Create exception rules
          for (const exceptionInput of input.variantRuleSet.exceptions) {
            const variantId = currentVariants.find(
              (v) => v.name === exceptionInput.variantName,
            )?.id;
            if (!variantId) {
              throw new Error(
                `Exception variant with name "${exceptionInput.variantName}" not found`,
              );
            }

            await tx.exceptionBasedRule.create({
              data: {
                id: exceptionInput.id ?? Guid.raw(),
                date: exceptionInput.date,
                variantId: variantId,
                variantRuleSetId: variantRuleSet.id,
              },
            });
          }
        }
      });

      // After successful transaction, fetch the complete updated schedule
      const schedule_res = await this.get_schedule(input.id);
      /* istanbul ignore if */
      if (!schedule_res.success) return schedule_res;

      return { success: true, data: schedule_res.data };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      this.log.error(`Failed to update complete schedule: ${errorMessage}`);
      return {
        success: false,
        message: `Failed to update complete schedule: ${errorMessage}`,
      };
    }
  }

  public async calculate_meeting_times(
    input: CalculateMeetingTimesInput,
  ): Promise<DataResponse<MeetingTimes[]>> {
    // 1. Get the schedule
    const schedule_res = await this.get_schedule(input.scheduleId);
    if (!schedule_res.success) return schedule_res;

    const schedule = schedule_res.data;
    if (!schedule.dayLabelRuleSet || !schedule.variantRuleSet) {
      return {
        success: false,
        message: "Schedule missing a recurrence rule set",
      };
    }

    const variantById = new Map<string, BellScheduleVariant>();
    for (const variant of schedule.variants) {
      variantById.set(variant.id, variant);
    }
    const dayById = new Map<string, BellScheduleDay>();
    for (const day of schedule.days) {
      dayById.set(day.id, day);
    }

    // 2. Determine which bell schedule days occur on each day of the date range
    const dayMap: Map<string, BellScheduleDay> = new Map(); // Map of date to the scheduleDayId
    switch (schedule.dayLabelRuleSet.type) {
      case DayLabelRecurrenceRuleType.DAY_OF_WEEK:
        const dayOfWeekRules = schedule.dayLabelRuleSet.dayOfWeekRules;
        if (!dayOfWeekRules) {
          return {
            success: false,
            message:
              "Schedule is day-of-week based but has no day-of-week rules",
          };
        }

        // Iterate through the date range, pulling the proper day from the rule set
        let date = input.dateRange.start;
        while (!date.isAfter(input.dateRange.end)) {
          const dayOfWeek = date.dayOfWeek().value();
          const day = dayOfWeekRules.find((d) => d.dayOfWeek === dayOfWeek);
          const day_object = dayById.get(day?.scheduleDayId ?? "");
          if (!day_object) {
            throw new Error(
              `Day with id ${day?.scheduleDayId} not found on the schedule`,
            );
          }
          dayMap.set(date.toString(), day_object);

          date = date.plusDays(1);
        }
        break;
      case DayLabelRecurrenceRuleType.PATTERN_BASED:
        const patternBasedRules = schedule.dayLabelRuleSet.patternBasedRules;
        if (!patternBasedRules) {
          return {
            success: false,
            message: "Schedule is pattern-based but has no pattern-based rules",
          };
        }
        if (!schedule.dayLabelRuleSet.seedDate) {
          return {
            success: false,
            message: "Schedule is pattern-based but has no seed date",
          };
        }

        // Count only active days when advancing through the pattern
        const seedDate = LocalDate.parse(schedule.dayLabelRuleSet.seedDate);

        const activeDaysSet = new Set(schedule.activeDaysOfWeek);
        const pattern_length = patternBasedRules.length;

        // Find the first active day on or after the start date
        let currentDate = input.dateRange.start;

        // Calculate how many active days have passed since the seed date mathematically
        const activeDaysSinceSeed = this.calculateActiveDaysBetween(
          seedDate,
          currentDate,
          activeDaysSet,
        );
        let patternIndex = activeDaysSinceSeed % pattern_length;

        // Iterate through the date range, only advancing pattern on active days
        while (!currentDate.isAfter(input.dateRange.end)) {
          const dayOfWeek = currentDate.dayOfWeek().value() % 7; // Convert to 0-6 (Sunday=0)

          if (activeDaysSet.has(dayOfWeek)) {
            const dayId = patternBasedRules.find(
              (d) => d.patternPosition === patternIndex,
            )?.scheduleDayId;
            if (!dayId) {
              throw new Error(
                `Pattern-based rule with position ${patternIndex} not found`,
              );
            }
            const day_object = dayById.get(dayId);
            if (!day_object) {
              throw new Error(`Day with id ${dayId} not found on the schedule`);
            }
            dayMap.set(currentDate.toString(), day_object);
            patternIndex = (patternIndex + 1) % pattern_length;
          }

          currentDate = currentDate.plusDays(1);
        }
        break;
    }

    // 3. Determine which variants are active on each day of the date range
    const variantMap: Map<string, BellScheduleVariant> = new Map(); // Map of date to the variantId
    const variantRuleSet = schedule.variantRuleSet;
    if (!variantRuleSet) {
      return { success: false, message: "Schedule missing a variant rule set" };
    }
    // First set any relevant exceptions
    const exceptions = variantRuleSet.exceptions ?? [];
    for (const exception of exceptions) {
      const date = LocalDate.parse(exception.date);
      if (
        !date.isBefore(input.dateRange.start) &&
        !date.isAfter(input.dateRange.end)
      ) {
        const variant_object = variantById.get(exception.variantId);
        if (!variant_object) {
          throw new Error(
            `Variant with id ${exception.variantId} not found on the schedule`,
          );
        }
        variantMap.set(date.toString(), variant_object);
      }
    }
    // Then set the remaining days to the default variant
    const defaultVariant = variantById.get(variantRuleSet.defaultVariantId);
    if (!defaultVariant) {
      throw new Error(
        `Default variant with id ${variantRuleSet.defaultVariantId} not found on the schedule`,
      );
    }
    for (const date of dayMap.keys()) {
      if (!variantMap.get(date)) {
        variantMap.set(date, defaultVariant);
      }
    }

    // 4. Combine the active variants with the active days to determine the meeting times
    const flatMeetingTimes: MeetingTimes[] = [];
    for (const date of dayMap.keys()) {
      const day = dayMap.get(date);
      const variant = variantMap.get(date);
      if (!day || !variant) {
        throw new Error(`Day or variant not found for date ${date}`);
      }

      flatMeetingTimes.push(
        ...this.combineDayAndVariant(day, variant, LocalDate.parse(date)),
      );
    }

    // 5. Return the meeting times
    const groupedMeetingTimes: MeetingTimes[] = flatMeetingTimes.reduce(
      (acc, meetingTime) => {
        const existingGroup = acc.find(
          (m) => m.scheduleGroupId === meetingTime.scheduleGroupId,
        );
        if (existingGroup) {
          existingGroup.meetingTimes.push(...meetingTime.meetingTimes);
        } else {
          acc.push(meetingTime);
        }
        return acc;
      },
      [] as MeetingTimes[],
    );

    return { success: true, data: groupedMeetingTimes };
  }

  private combineDayAndVariant(
    day: BellScheduleDay,
    variant: BellScheduleVariant,
    date: LocalDate,
  ): MeetingTimes[] {
    // Order the groups on the day and insert them into the variant time slots
    const groups = day.groups;
    const timeSlots = variant.timeSlots;

    const meetingTimes: MeetingTimes[] = groups.map((group, index) => ({
      scheduleGroupId: group.id,
      meetingTimes: [
        {
          start: LocalDateTime.parse(
            `${date.toString()}T${timeSlots[index].start}`,
          ),
          end: LocalDateTime.parse(
            `${date.toString()}T${timeSlots[index].end}`,
          ),
        },
      ],
    }));

    return meetingTimes;
  }

  /**
   * Calculate the number of active days between two dates.
   * This is used for pattern-based day calculations.
   */
  private calculateActiveDaysBetween(
    startDate: LocalDate,
    endDate: LocalDate,
    activeDaysSet: Set<number>,
  ): number {
    let count = 0;
    let currentDate = startDate;

    while (currentDate.isBefore(endDate)) {
      const dayOfWeek = currentDate.dayOfWeek().value() % 7; // Convert to 0-6 (Sunday=0)
      if (activeDaysSet.has(dayOfWeek)) {
        count++;
      }
      currentDate = currentDate.plusDays(1);
    }

    return count;
  }
}
