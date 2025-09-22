// rbv.integration.test.ts
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from 'vitest'
import { Container } from 'inversify'
import { RBVHelper } from '../rbv_helper'
import {
  BellScheduleFactory,
  BellScheduleDayFactory,
  BellScheduleGroupFactory,
  BellScheduleVariantFactory,
  TimeSlotFactory,
  DayLabelRuleSetFactory,
  PatternBasedRuleFactory,
  VariantRuleSetFactory,
  ExceptionBasedRuleFactory,
} from './builders/rbv.factories'
import {
  BellSchedule,
  BellScheduleDay,
  BellScheduleVariant,
  DayLabelRuleSet,
  VariantRuleSet,
  CreateCompleteScheduleInput,
  UpdateCompleteScheduleInput,
  DeleteBellScheduleInput
} from '../rbv.types'
import { BellScheduleBuilder } from './builders/rbv.builders'
import { prisma, DayLabelRecurrenceRuleType } from '@repo/db'
import type { ILogger } from '@hipponot/soa-logger'
import { faker } from '@faker-js/faker'
import { LocalDate } from '@js-joda/core'

const mockLogger: ILogger = {
  info: console.log,
  warn: console.log,
  error: console.log,
  debug: console.log,
}

describe('RBVHelper', () => {
  let container: Container
  let rbv_helper: RBVHelper

  beforeEach(async () => {
    container = new Container()
    container.bind<ILogger>('ILogger').toConstantValue(mockLogger)
    container.bind('RBVHelper').to(RBVHelper)
    rbv_helper = container.get<RBVHelper>('RBVHelper')

    // Clean up database before each test
    await prisma.bellSchedule.deleteMany()
  })

  afterEach(async () => {
    // Clean up database after each test
    await prisma.bellSchedule.deleteMany()
  })

  // ============================================================================
  // BASIC CRUD OPERATIONS - Only essential methods we kept
  // ============================================================================

  describe('get_schedule', () => {
    it('returns a schedule with all nested entities', async () => {
      const schedule = BellScheduleFactory.build()
      const createdSchedule = await prisma.bellSchedule.create({
        data: {
          id: schedule.id,
          name: schedule.name,
          description: schedule.description,
          activeDaysOfWeek: schedule.activeDaysOfWeek,
          days: {
            create: schedule.days.map(day => ({
              id: day.id,
              name: day.name,
              description: day.description,
            })),
          },
          variants: {
            create: schedule.variants.map(variant => ({
              id: variant.id,
              name: variant.name,
              description: variant.description,
              timeSlots: {
                create: variant.timeSlots.map(slot => ({
                  id: slot.id,
                  name: slot.name,
                  start: slot.start,
                  end: slot.end,
                })),
              },
            })),
          },
          groups: {
            create: schedule.groups.map(group => ({
              id: group.id,
              name: group.name,
              description: group.description,
            })),
          },
        },
      })

      const result = await rbv_helper.get_schedule(createdSchedule.id)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(createdSchedule.id)
        expect(result.data.name).toBe(schedule.name)
      }
    })

    it('returns error when schedule not found', async () => {
      const result = await rbv_helper.get_schedule(faker.string.uuid())

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.message).toBe('Requested bell schedule not found')
      }
    })
  })

  describe('delete_schedule', () => {
    it('deletes a schedule and all related entities', async () => {
      const schedule = BellScheduleFactory.build()
      const createdSchedule = await prisma.bellSchedule.create({
        data: {
          id: schedule.id,
          name: schedule.name,
          description: schedule.description,
          activeDaysOfWeek: schedule.activeDaysOfWeek,
          days: {
            create: schedule.days.map(day => ({
              id: day.id,
              name: day.name,
              description: day.description,
            })),
          },
          variants: {
            create: schedule.variants.map(variant => ({
              id: variant.id,
              name: variant.name,
              description: variant.description,
              timeSlots: {
                create: variant.timeSlots.map(slot => ({
                  id: slot.id,
                  name: slot.name,
                  start: slot.start,
                  end: slot.end,
                })),
              },
            })),
          },
          groups: {
            create: schedule.groups.map(group => ({
              id: group.id,
              name: group.name,
              description: group.description,
            })),
          },
        },
      })

      const result = await rbv_helper.delete_schedule({ id: createdSchedule.id })

      expect(result.success).toBe(true)

      // Verify schedule was deleted
      const findResult = await rbv_helper.get_schedule(createdSchedule.id)
      expect(findResult.success).toBe(false)
    })

    it('returns error when schedule not found', async () => {
      const result = await rbv_helper.delete_schedule({ id: faker.string.uuid() })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.message).toBe('Requested bell schedule not found')
      }
    })
  })

  // ============================================================================
  // AGGREGATE OPERATION TESTS - Complete Schedule Creation
  // ============================================================================

  describe('Aggregate Operations - Complete Schedule Creation', () => {
    describe('createCompleteSchedule', () => {
      it('creates a complete schedule with all components in a single transaction', async () => {
        // ARRANGE
        const scheduleInput: CreateCompleteScheduleInput = {
          name: 'Test Complete Schedule',
          description: 'A comprehensive test schedule',
          activeDaysOfWeek: [1, 2, 3, 4, 5], // Monday through Friday

          days: [
            {
              name: 'Regular Day',
              description: 'Standard school day',
            },
            {
              name: 'Shortened Day',
              description: 'Shortened schedule day',
            },
          ],

          variants: [
            {
              name: 'Normal Schedule',
              description: 'Regular bell schedule',
              timeSlots: [
                { name: 'Period 1', start: '08:00', end: '09:30' },
                { name: 'Period 2', start: '09:35', end: '11:05' },
                { name: 'Lunch', start: '11:05', end: '11:50' },
                { name: 'Period 3', start: '11:55', end: '13:25' },
              ],
            },
            {
              name: 'Delayed Start',
              description: 'Two hour delay schedule',
              timeSlots: [
                { name: 'Period 1', start: '10:00', end: '11:00' },
                { name: 'Period 2', start: '11:05', end: '12:05' },
                { name: 'Lunch', start: '12:05', end: '12:35' },
                { name: 'Period 3', start: '12:40', end: '13:40' },
              ],
            },
          ],

          groups: [
            { name: 'Group A', description: 'First group' },
            { name: 'Group B', description: 'Second group' },
          ],

          dayLabelRuleSet: {
            name: 'Day Rotation Rules',
            type: DayLabelRecurrenceRuleType.DAY_OF_WEEK,
            description: 'Weekly rotation pattern',
            dayOfWeekRules: [
              { dayOfWeek: 1, scheduleDayName: 'Regular Day' }, // Monday
              { dayOfWeek: 2, scheduleDayName: 'Regular Day' }, // Tuesday
              { dayOfWeek: 3, scheduleDayName: 'Shortened Day' }, // Wednesday
              { dayOfWeek: 4, scheduleDayName: 'Regular Day' }, // Thursday
              { dayOfWeek: 5, scheduleDayName: 'Regular Day' }, // Friday
            ],
          },

          variantRuleSet: {
            name: 'Schedule Variant Rules',
            description: 'Rules for applying schedule variants',
            defaultVariantName: 'Normal Schedule',
            exceptions: [
              {
                date: LocalDate.now().plusDays(7).toString(), // Next week
                variantName: 'Delayed Start',
              },
            ],
          },
        };

        // ACT
        const result = await rbv_helper.createCompleteSchedule(scheduleInput);

        // ASSERT
        expect(result.success).toBe(true);
        if (!result.success) throw new Error(result.message);

        const createdSchedule = result.data;

        // Verify main schedule properties
        expect(createdSchedule.name).toBe(scheduleInput.name);
        expect(createdSchedule.description).toBe(scheduleInput.description);
        expect(createdSchedule.activeDaysOfWeek).toEqual(scheduleInput.activeDaysOfWeek);

        // Verify days were created
        expect(createdSchedule.days).toHaveLength(2);
        expect(createdSchedule.days.map(d => d.name)).toEqual(['Regular Day', 'Shortened Day']);

        // Verify variants were created with time slots
        expect(createdSchedule.variants).toHaveLength(2);
        const normalVariant = createdSchedule.variants.find(v => v.name === 'Normal Schedule');
        expect(normalVariant).toBeDefined();
        expect(normalVariant!.timeSlots).toHaveLength(4);
        expect(normalVariant!.timeSlots[0].name).toBe('Period 1');

        // Verify groups were created
        expect(createdSchedule.groups).toHaveLength(2);
        expect(createdSchedule.groups.map(g => g.name)).toEqual(['Group A', 'Group B']);

        // Verify day label rule set was created
        expect(createdSchedule.dayLabelRuleSet).toBeDefined();
        expect(createdSchedule.dayLabelRuleSet!.type).toBe(DayLabelRecurrenceRuleType.DAY_OF_WEEK);
        expect(createdSchedule.dayLabelRuleSet!.dayOfWeekRules).toHaveLength(5);

        // Verify variant rule set was created
        expect(createdSchedule.variantRuleSet).toBeDefined();
        expect(createdSchedule.variantRuleSet!.exceptions).toHaveLength(1);
        expect(createdSchedule.variantRuleSet!.exceptions[0].date).toBe(LocalDate.now().plusDays(7).toString());
      });

      it('creates a schedule with pattern-based day rules', async () => {
        // ARRANGE
        const scheduleInput: CreateCompleteScheduleInput = {
          name: 'Pattern Schedule',
          description: 'Schedule with pattern-based rotation',
          activeDaysOfWeek: [1, 2, 3, 4, 5],

          days: [
            { name: 'A Day', description: 'First day in pattern' },
            { name: 'B Day', description: 'Second day in pattern' },
          ],

          variants: [
            {
              name: 'Standard',
              description: 'Standard schedule',
              timeSlots: [
                { name: 'Block 1', start: '08:30', end: '10:00' },
                { name: 'Block 2', start: '10:05', end: '11:35' },
              ],
            },
          ],

          groups: [
            { name: 'All Students', description: 'All students group' },
          ],

          dayLabelRuleSet: {
            name: 'AB Pattern',
            type: DayLabelRecurrenceRuleType.PATTERN_BASED,
            description: 'Alternating A/B day pattern',
            seedDate: LocalDate.now().toString(),
            patternBasedRules: [
              { patternPosition: 0, scheduleDayName: 'A Day' },
              { patternPosition: 1, scheduleDayName: 'B Day' },
            ],
          },

          variantRuleSet: {
            name: 'Standard Rules',
            description: 'Standard variant rules',
            defaultVariantName: 'Standard',
            exceptions: [],
          },
        };

        // ACT
        const result = await rbv_helper.createCompleteSchedule(scheduleInput);

        // ASSERT
        expect(result.success).toBe(true);
        if (!result.success) throw new Error(result.message);

        const createdSchedule = result.data;
        expect(createdSchedule.dayLabelRuleSet!.type).toBe(DayLabelRecurrenceRuleType.PATTERN_BASED);
        expect(createdSchedule.dayLabelRuleSet!.patternBasedRules).toHaveLength(2);
        expect(createdSchedule.dayLabelRuleSet!.seedDate).toBe(LocalDate.now().toString());
      });

      it('handles transaction rollback on error', async () => {
        // ARRANGE - Create invalid input that will cause an error
        const scheduleInput: CreateCompleteScheduleInput = {
          name: 'Invalid Schedule',
          description: 'This should fail',
          activeDaysOfWeek: [1, 2, 3, 4, 5],

          days: [
            { name: 'Test Day', description: 'Test day' },
          ],

          variants: [
            {
              name: 'Test Variant',
              description: 'Test variant',
              timeSlots: [
                { name: 'Period 1', start: '08:00', end: '09:30' },
              ],
            },
          ],

          groups: [],

          dayLabelRuleSet: {
            name: 'Invalid Rules',
            type: DayLabelRecurrenceRuleType.DAY_OF_WEEK,
            description: 'Rules that reference non-existent day',
            dayOfWeekRules: [
              { dayOfWeek: 1, scheduleDayName: 'Non-Existent Day' }, // This should cause an error
            ],
          },

          variantRuleSet: {
            name: 'Test Rules',
            description: 'Test rules',
            defaultVariantName: 'Test Variant',
            exceptions: [],
          },
        };

        // ACT
        const result = await rbv_helper.createCompleteSchedule(scheduleInput);

        // ASSERT - Should fail due to invalid day reference
        expect(result.success).toBe(false);
        expect(result.message).toContain('Non-Existent Day');

        // Verify no partial data was created (transaction rollback worked)
        const schedules = await prisma.bellSchedule.findMany({
          where: { name: 'Invalid Schedule' },
        });
        expect(schedules).toHaveLength(0);
      });

      it('creates schedule with minimal required fields only', async () => {
        // ARRANGE
        const scheduleInput: CreateCompleteScheduleInput = {
          name: 'Minimal Schedule',
          activeDaysOfWeek: [1, 2, 3, 4, 5],
          days: [{ name: 'Basic Day' }],
          variants: [
            {
              name: 'Basic Variant',
              timeSlots: [{ name: 'Period 1', start: '08:00', end: '09:00' }],
            },
          ],
          groups: [],
          // No rule sets provided
        };

        // ACT
        const result = await rbv_helper.createCompleteSchedule(scheduleInput);

        // ASSERT
        expect(result.success).toBe(true);
        if (!result.success) throw new Error(result.message);

        const createdSchedule = result.data;
        expect(createdSchedule.name).toBe('Minimal Schedule');
        expect(createdSchedule.days).toHaveLength(1);
        expect(createdSchedule.variants).toHaveLength(1);
        expect(createdSchedule.groups).toHaveLength(0);
        expect(createdSchedule.dayLabelRuleSet).toBeNull();
        expect(createdSchedule.variantRuleSet).toBeNull();
      });

      it('validates that variant names exist when referenced in rule sets', async () => {
        // ARRANGE
        const scheduleInput: CreateCompleteScheduleInput = {
          name: 'Test Schedule',
          activeDaysOfWeek: [1, 2, 3, 4, 5],
          days: [{ name: 'Test Day' }],
          variants: [{ name: 'Real Variant', timeSlots: [] }],
          groups: [],
          variantRuleSet: {
            name: 'Test Rules',
            description: 'Test rules',
            defaultVariantName: 'Non-Existent Variant', // This should fail
            exceptions: [],
          },
        };

        // ACT
        const result = await rbv_helper.createCompleteSchedule(scheduleInput);

        // ASSERT
        expect(result.success).toBe(false);
        expect(result.message).toContain('Non-Existent Variant');
      });
    })

    describe('updateCompleteSchedule', () => {
      let baseSchedule: BellSchedule;

      beforeEach(async () => {
        // Create a base schedule to test updates on
        const scheduleInput: CreateCompleteScheduleInput = {
          name: 'Base Schedule',
          description: 'Original description',
          activeDaysOfWeek: [1, 2, 3, 4, 5],

          days: [
            { name: 'Original Day 1', description: 'First day' },
            { name: 'Original Day 2', description: 'Second day' },
          ],

          variants: [
            {
              name: 'Original Variant',
              description: 'Original variant',
              timeSlots: [
                { name: 'Period 1', start: '08:00', end: '09:00' },
                { name: 'Period 2', start: '09:00', end: '10:00' },
              ],
            },
          ],

          groups: [
            { name: 'Original Group', description: 'Original group' },
          ],

          dayLabelRuleSet: {
            name: 'Original Day Rules',
            type: DayLabelRecurrenceRuleType.DAY_OF_WEEK,
            description: 'Original day rules',
            dayOfWeekRules: [
              { dayOfWeek: 1, scheduleDayName: 'Original Day 1' },
              { dayOfWeek: 2, scheduleDayName: 'Original Day 2' },
            ],
          },

          variantRuleSet: {
            name: 'Original Variant Rules',
            description: 'Original variant rules',
            defaultVariantName: 'Original Variant',
            exceptions: [],
          },
        };

        const result = await rbv_helper.createCompleteSchedule(scheduleInput);
        if (!result.success) throw new Error(result.message);
        baseSchedule = result.data;
      });

      it('updates basic schedule properties', async () => {
        // ARRANGE
        const updateInput: UpdateCompleteScheduleInput = {
          id: baseSchedule.id,
          name: 'Updated Schedule Name',
          description: 'Updated description',
          activeDaysOfWeek: [1, 2, 3, 4, 5, 6], // Add Saturday
        };

        // ACT
        const result = await rbv_helper.updateCompleteSchedule(updateInput);

        // ASSERT
        expect(result.success).toBe(true);
        if (!result.success) throw new Error(result.message);

        const updatedSchedule = result.data;
        expect(updatedSchedule.name).toBe('Updated Schedule Name');
        expect(updatedSchedule.description).toBe('Updated description');
        expect(updatedSchedule.activeDaysOfWeek).toEqual([1, 2, 3, 4, 5, 6]);
      });

      it('adds new days while keeping existing ones', async () => {
        // ARRANGE
        const updateInput: UpdateCompleteScheduleInput = {
          id: baseSchedule.id,
          days: {
            create: [
              { name: 'New Day 1', description: 'First new day' },
              { name: 'New Day 2', description: 'Second new day' },
            ],
          },
        };

        // ACT
        const result = await rbv_helper.updateCompleteSchedule(updateInput);

        // ASSERT
        expect(result.success).toBe(true);
        if (!result.success) throw new Error(result.message);

        const updatedSchedule = result.data;
        expect(updatedSchedule.days).toHaveLength(4); // 2 original + 2 new
        expect(updatedSchedule.days.map(d => d.name)).toContain('New Day 1');
        expect(updatedSchedule.days.map(d => d.name)).toContain('New Day 2');
        expect(updatedSchedule.days.map(d => d.name)).toContain('Original Day 1');
      });

      it('updates existing days', async () => {
        // ARRANGE
        const dayToUpdate = baseSchedule.days[0];
        const updateInput: UpdateCompleteScheduleInput = {
          id: baseSchedule.id,
          days: {
            update: [
              {
                id: dayToUpdate.id,
                name: 'Updated Day Name',
                description: 'Updated day description',
              },
            ],
          },
        };

        // ACT
        const result = await rbv_helper.updateCompleteSchedule(updateInput);

        // ASSERT
        expect(result.success).toBe(true);
        if (!result.success) throw new Error(result.message);

        const updatedSchedule = result.data;
        const updatedDay = updatedSchedule.days.find(d => d.id === dayToUpdate.id);
        expect(updatedDay).toBeDefined();
        expect(updatedDay!.name).toBe('Updated Day Name');
        expect(updatedDay!.description).toBe('Updated day description');
      });

      it('deletes existing days', async () => {
        // ARRANGE
        const dayToDelete = baseSchedule.days[0];
        const updateInput: UpdateCompleteScheduleInput = {
          id: baseSchedule.id,
          days: {
            delete: [dayToDelete.id],
          },
        };

        // ACT
        const result = await rbv_helper.updateCompleteSchedule(updateInput);

        // ASSERT
        expect(result.success).toBe(true);
        if (!result.success) throw new Error(result.message);

        const updatedSchedule = result.data;
        expect(updatedSchedule.days).toHaveLength(1); // 1 day deleted
        expect(updatedSchedule.days.find(d => d.id === dayToDelete.id)).toBeUndefined();
      });

      it('handles complex variant updates with time slots', async () => {
        // ARRANGE
        const originalVariant = baseSchedule.variants[0];
        const originalTimeSlot = originalVariant.timeSlots[0];

        const updateInput: UpdateCompleteScheduleInput = {
          id: baseSchedule.id,
          variants: {
            // Update existing variant
            update: [
              {
                id: originalVariant.id,
                name: 'Updated Variant Name',
                timeSlots: {
                  // Update existing time slot
                  update: [
                    {
                      id: originalTimeSlot.id,
                      name: 'Updated Period 1',
                      start: '08:30',
                    },
                  ],
                  // Add new time slot
                  create: [
                    { name: 'New Period 3', start: '10:00', end: '11:00' },
                  ],
                  // Delete the second time slot
                  delete: [originalVariant.timeSlots[1].id],
                },
              },
            ],
            // Add completely new variant
            create: [
              {
                name: 'Brand New Variant',
                description: 'Completely new variant',
                timeSlots: [
                  { name: 'Block A', start: '09:00', end: '10:30' },
                  { name: 'Block B', start: '10:35', end: '12:05' },
                ],
              },
            ],
          },
        };

        // ACT
        const result = await rbv_helper.updateCompleteSchedule(updateInput);

        // ASSERT
        expect(result.success).toBe(true);
        if (!result.success) throw new Error(result.message);

        const updatedSchedule = result.data;

        // Check we have the right number of variants
        expect(updatedSchedule.variants).toHaveLength(2);

        // Check updated variant
        const updatedVariant = updatedSchedule.variants.find(v => v.id === originalVariant.id);
        expect(updatedVariant).toBeDefined();
        expect(updatedVariant!.name).toBe('Updated Variant Name');
        expect(updatedVariant!.timeSlots).toHaveLength(2); // 1 updated + 1 new (1 deleted)

        // Check updated time slot
        const updatedTimeSlot = updatedVariant!.timeSlots.find(ts => ts.id === originalTimeSlot.id);
        expect(updatedTimeSlot).toBeDefined();
        expect(updatedTimeSlot!.name).toBe('Updated Period 1');
        expect(updatedTimeSlot!.start).toBe('08:30');

        // Check new time slot was added
        const newTimeSlot = updatedVariant!.timeSlots.find(ts => ts.name === 'New Period 3');
        expect(newTimeSlot).toBeDefined();

        // Check new variant was created
        const newVariant = updatedSchedule.variants.find(v => v.name === 'Brand New Variant');
        expect(newVariant).toBeDefined();
        expect(newVariant!.timeSlots).toHaveLength(2);
      });

      it('replaces day label rule set completely', async () => {
        // ARRANGE
        const updateInput: UpdateCompleteScheduleInput = {
          id: baseSchedule.id,
          dayLabelRuleSet: {
            name: 'New Day Rule Set',
            type: DayLabelRecurrenceRuleType.PATTERN_BASED,
            description: 'New pattern-based rules',
            seedDate: LocalDate.now().toString(),
            patternBasedRules: [
              { patternPosition: 0, scheduleDayName: 'Original Day 1' },
              { patternPosition: 1, scheduleDayName: 'Original Day 2' },
            ],
          },
        };

        // ACT
        const result = await rbv_helper.updateCompleteSchedule(updateInput);

        // ASSERT
        expect(result.success).toBe(true);
        if (!result.success) throw new Error(result.message);

        const updatedSchedule = result.data;
        expect(updatedSchedule.dayLabelRuleSet).toBeDefined();
        expect(updatedSchedule.dayLabelRuleSet!.name).toBe('New Day Rule Set');
        expect(updatedSchedule.dayLabelRuleSet!.type).toBe(DayLabelRecurrenceRuleType.PATTERN_BASED);
        expect(updatedSchedule.dayLabelRuleSet!.patternBasedRules).toHaveLength(2);
        expect(updatedSchedule.dayLabelRuleSet!.dayOfWeekRules).toHaveLength(0);
      });

      it('replaces variant rule set completely', async () => {
        // ARRANGE
        const updateInput: UpdateCompleteScheduleInput = {
          id: baseSchedule.id,
          variantRuleSet: {
            name: 'New Variant Rule Set',
            description: 'New variant rules with exceptions',
            defaultVariantName: 'Original Variant',
            exceptions: [
              {
                date: LocalDate.now().plusDays(10).toString(),
                variantName: 'Original Variant',
              },
            ],
          },
        };

        // ACT
        const result = await rbv_helper.updateCompleteSchedule(updateInput);

        // ASSERT
        expect(result.success).toBe(true);
        if (!result.success) throw new Error(result.message);

        const updatedSchedule = result.data;
        expect(updatedSchedule.variantRuleSet).toBeDefined();
        expect(updatedSchedule.variantRuleSet!.name).toBe('New Variant Rule Set');
        expect(updatedSchedule.variantRuleSet!.exceptions).toHaveLength(1);
        expect(updatedSchedule.variantRuleSet!.exceptions[0].date).toBe(LocalDate.now().plusDays(10).toString());
      });

      it('handles partial updates (only specified fields)', async () => {
        // ARRANGE - Only update the schedule name, leave everything else unchanged
        const updateInput: UpdateCompleteScheduleInput = {
          id: baseSchedule.id,
          name: 'Only Name Changed',
          // No other fields specified
        };

        // ACT
        const result = await rbv_helper.updateCompleteSchedule(updateInput);

        // ASSERT
        expect(result.success).toBe(true);
        if (!result.success) throw new Error(result.message);

        const updatedSchedule = result.data;
        expect(updatedSchedule.name).toBe('Only Name Changed');
        expect(updatedSchedule.description).toBe('Original description'); // Unchanged
        expect(updatedSchedule.days).toHaveLength(2); // Unchanged
        expect(updatedSchedule.variants).toHaveLength(1); // Unchanged
        expect(updatedSchedule.groups).toHaveLength(1); // Unchanged
      });

      it('handles transaction rollback on invalid references', async () => {
        // ARRANGE - Try to update with invalid day reference
        const updateInput: UpdateCompleteScheduleInput = {
          id: baseSchedule.id,
          name: 'This Should Fail',
          dayLabelRuleSet: {
            name: 'Invalid Rules',
            type: DayLabelRecurrenceRuleType.DAY_OF_WEEK,
            description: 'Rules with invalid reference',
            dayOfWeekRules: [
              { dayOfWeek: 1, scheduleDayName: 'Non-Existent Day' }, // This should fail
            ],
          },
        };

        // ACT
        const result = await rbv_helper.updateCompleteSchedule(updateInput);

        // ASSERT
        expect(result.success).toBe(false);
        expect(result.message).toContain('Non-Existent Day');

        // Verify original schedule is unchanged (transaction rollback worked)
        const unchangedSchedule = await rbv_helper.get_schedule(baseSchedule.id);
        if (!unchangedSchedule.success) throw new Error(unchangedSchedule.message);
        expect(unchangedSchedule.data.name).toBe('Base Schedule'); // Original name preserved
      });

      it('validates schedule exists before update', async () => {
        // ARRANGE
        const updateInput: UpdateCompleteScheduleInput = {
          id: 'non-existent-schedule-id',
          name: 'This Should Fail',
        };

        // ACT
        const result = await rbv_helper.updateCompleteSchedule(updateInput);

        // ASSERT
        expect(result.success).toBe(false);
        expect(result.message).toContain('update');
      });
    })
  })
})