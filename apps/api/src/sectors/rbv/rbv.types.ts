import {
  BellScheduleGroup,
  DayOfWeekRule,
  PatternBasedRule,
  BellSchedule as PrismaBellSchedule,
  BellScheduleDay as PrismaBellScheduleDay,
  BellScheduleVariant as PrismaBellScheduleVariant,
  DayLabelRuleSet as PrismaDayLabelRuleSet,
  TimeSlot,
  VariantRuleSet,
} from '@repo/db';
import { LocalDate, LocalDateTime } from '@js-joda/core';

// Bell Schedule related types
export type BellSchedule = PrismaBellSchedule & {
  days: BellScheduleDay[];
  variants: BellScheduleVariant[];
  groups: BellScheduleGroup[];

  // Each schedule has exactly one recurrence rule set
  dayLabelRuleSet: DayLabelRuleSet | null;
  variantRuleSet: VariantRuleSet | null;
};
export type UpsertBellScheduleInput = Omit<PrismaBellSchedule, 'id'> & { id?: BellSchedule['id'] };
export interface DeleteBellScheduleInput {
  id: BellSchedule['id'];
}

// Bell Schedule Day related types
export type BellScheduleDay = PrismaBellScheduleDay & {
  groups: BellScheduleGroup[];
};
export type UpsertBellScheduleDayInput = Omit<BellScheduleDay, 'id'> & {
  id?: BellScheduleDay['id'];
};
export interface DeleteBellScheduleDayInput {
  id: BellScheduleDay['id'];
}

// Bell Schedule Variant related types
export type BellScheduleVariant = PrismaBellScheduleVariant & {
  timeSlots: TimeSlot[];
};
export type UpsertBellScheduleVariantInput = Omit<PrismaBellScheduleVariant, 'id'> & {
  id?: BellScheduleVariant['id'];
};
export interface DeleteBellScheduleVariantInput {
  id: BellScheduleVariant['id'];
}

export type DayLabelRuleSet = PrismaDayLabelRuleSet & {
  dayOfWeekRules?: DayOfWeekRule[];
  patternBasedRules?: PatternBasedRule[];
};
export type UpsertDayLabelRuleSetInput = Omit<PrismaDayLabelRuleSet, 'id'> & {
  id?: DayLabelRuleSet['id'];
};
export interface DeleteDayLabelRuleSetInput {
  id: DayLabelRuleSet['id'];
}

// Time Slot related types
export type UpsertTimeSlotInput = Omit<TimeSlot, 'id'> & {
  id?: TimeSlot['id'];
};
export interface DeleteTimeSlotInput {
  id: TimeSlot['id'];
}

export interface CalculateMeetingTimesInput {
  scheduleId: string;
  dateRange: {
    start: LocalDate;
    end: LocalDate;
  };
}

export interface MeetingTimes {
  scheduleGroupId: string;
  meetingTimes: {
    start: LocalDateTime;
    end: LocalDateTime;
  }[];
}
