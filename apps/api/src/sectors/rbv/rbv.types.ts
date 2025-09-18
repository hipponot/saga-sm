import {
  BellScheduleGroup,
  DayOfWeekRule,
  PatternBasedRule,
  BellSchedule as PrismaBellSchedule,
  BellScheduleDay as PrismaBellScheduleDay,
  BellScheduleVariant as PrismaBellScheduleVariant,
  DayLabelRuleSet as PrismaDayLabelRuleSet,
  TimeSlot,
  ExceptionBasedRule,
  VariantRuleSet as PrismaVariantRuleSet,
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
export type UpsertBellScheduleDayInput = Omit<BellScheduleDay, 'id' | 'groups'> & {
  id?: BellScheduleDay['id'];
};
export interface DeleteBellScheduleDayInput {
  id: BellScheduleDay['id'];
}

// Bell Schedule Group related types
export type UpsertBellScheduleGroupInput = Omit<BellScheduleGroup, 'id'> & {
  id?: BellScheduleGroup['id'];
};
export interface DeleteBellScheduleGroupInput {
  id: BellScheduleGroup['id'];
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

export type VariantRuleSet = PrismaVariantRuleSet & {
  exceptions: ExceptionBasedRule[];
}
export type UpsertVariantRuleSetInput = Omit<VariantRuleSet, 'id' | 'exceptions'> & {
  id?: VariantRuleSet['id'];
};
export interface DeleteVariantRuleSetInput {
  id: VariantRuleSet['id'];
}

export type DayLabelRuleSet = PrismaDayLabelRuleSet & {
  dayOfWeekRules?: DayOfWeekRule[];
  patternBasedRules?: PatternBasedRule[];
};
export type UpsertDayLabelRuleSetInput = Omit<DayLabelRuleSet, 'id' | 'dayOfWeekRules' | 'patternBasedRules'> & {
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

// Day Of Week Rule related types
export type UpsertDayOfWeekRuleInput = Omit<DayOfWeekRule, 'id'> & {
  id?: DayOfWeekRule['id'];
};
export interface DeleteDayOfWeekRuleInput {
  id: DayOfWeekRule['id'];
}

// Pattern Based Rule related types
export type UpsertPatternBasedRuleInput = Omit<PatternBasedRule, 'id'> & {
  id?: PatternBasedRule['id'];
};
export interface DeletePatternBasedRuleInput {
  id: PatternBasedRule['id'];
}

// Exception Based Rule related types
export type UpsertExceptionBasedRuleInput = Omit<ExceptionBasedRule, 'id'> & {
  id?: ExceptionBasedRule['id'];
};
export interface DeleteExceptionBasedRuleInput {
  id: ExceptionBasedRule['id'];
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
