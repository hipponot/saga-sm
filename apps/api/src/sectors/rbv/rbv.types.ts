import {
  DayOfWeekRule,
  PatternBasedRule,
  BellSchedule as PrismaBellSchedule,
  BellScheduleDay as PrismaBellScheduleDay,
  BellScheduleVariant as PrismaBellScheduleVariant,
  DayRecurrenceRuleSet as PrismaDayRecurrenceRuleSet,
  TimeSlot as PrismaTimeSlot,
} from '@repo/db'

// Bell Schedule related types
export type BellSchedule = PrismaBellSchedule & {
  days: BellScheduleDay[];
  timeSlots: TimeSlot[];
  recurrenceRuleSet: DayRecurrenceRuleSet | null;
};
export type UpsertBellScheduleInput = Omit<PrismaBellSchedule, 'id'> & { id?: BellSchedule['id'] };
export interface DeleteBellScheduleInput {
  id: BellSchedule['id'];
}

// Bell Schedule Day related types
export type BellScheduleDay = PrismaBellScheduleDay & {
  variants: BellScheduleVariant[];
  timeSlots: TimeSlot[];

  dayOfWeekRules: DayOfWeekRule[];
  patternBasedRules: PatternBasedRule[];
};
export type UpsertBellScheduleDayInput = Omit<PrismaBellScheduleDay, 'id'> & {
  id?: BellScheduleDay['id'];
};
export interface DeleteBellScheduleDayInput {
  id: BellScheduleDay['id'];
}

// Bell Schedule Variant related types
export type BellScheduleVariant = PrismaBellScheduleVariant;
export type UpsertBellScheduleVariantInput = Omit<PrismaBellScheduleVariant, 'id'> & {
  id?: BellScheduleVariant['id'];
};
export interface DeleteBellScheduleVariantInput {
  id: BellScheduleVariant['id'];
}

export type DayRecurrenceRuleSet = PrismaDayRecurrenceRuleSet & {
  dayOfWeekRules?: DayOfWeekRule[];
  patternBasedRules?: PatternBasedRule[];
};
export type UpsertDayRecurrenceRuleSetInput = Omit<PrismaDayRecurrenceRuleSet, 'id'> & {
  id?: DayRecurrenceRuleSet['id'];
};
export interface DeleteDayRecurrenceRuleSetInput {
  id: DayRecurrenceRuleSet['id'];
}

export type TimeSlot = PrismaTimeSlot;
export type UpsertTimeSlotInput = Omit<PrismaTimeSlot, 'id'> & {
  id?: TimeSlot['id'];
};
export interface DeleteTimeSlotInput {
  id: TimeSlot['id'];
}