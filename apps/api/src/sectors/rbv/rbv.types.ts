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
  DayLabelRecurrenceRuleType,
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

export interface DeleteBellScheduleInput {
  id: BellSchedule['id'];
}

// Bell Schedule Day related types
export type BellScheduleDay = PrismaBellScheduleDay & {
  groups: BellScheduleGroup[];
};

// Bell Schedule Variant related types
export type BellScheduleVariant = PrismaBellScheduleVariant & {
  timeSlots: TimeSlot[];
};

export type VariantRuleSet = PrismaVariantRuleSet & {
  exceptions: ExceptionBasedRule[];
}

export type DayLabelRuleSet = PrismaDayLabelRuleSet & {
  dayOfWeekRules?: DayOfWeekRule[];
  patternBasedRules?: PatternBasedRule[];
};

// Business logic interfaces
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

// ============================================================================
// AGGREGATE OPERATION TYPES - For creating/updating complete schedules
// ============================================================================

export interface CreateCompleteScheduleInput {
  id?: string;
  name: string;
  description?: string;
  activeDaysOfWeek: number[];

  // Nested entities to create
  days: Array<{
    id?: string;
    name: string;
    description?: string;
  }>;

  variants: Array<{
    id?: string;
    name: string;
    description?: string;
    timeSlots: Array<{
      id?: string;
      name: string;
      start: string;
      end: string;
    }>;
  }>;

  groups: Array<{
    id?: string;
    name: string;
    description?: string;
  }>;

  // Rule sets - exactly one of each type per schedule
  dayLabelRuleSet?: {
    id?: string;
    name: string;
    type: DayLabelRecurrenceRuleType;
    description?: string;
    seedDate?: string;

    // Rules - only include the appropriate type based on rule set type
    dayOfWeekRules?: Array<{
      id?: string;
      dayOfWeek: number;
      scheduleDayName: string; // Reference by name instead of ID for easier creation
    }>;

    patternBasedRules?: Array<{
      id?: string;
      patternPosition: number;
      scheduleDayName: string; // Reference by name instead of ID for easier creation
    }>;
  };

  variantRuleSet?: {
    id?: string;
    name: string;
    description?: string;
    defaultVariantName: string; // Reference by name instead of ID for easier creation

    exceptions: Array<{
      id?: string;
      date: string; // YYYY-MM-DD format
      variantName: string; // Reference by name instead of ID for easier creation
    }>;
  };
}

export interface UpdateCompleteScheduleInput {
  id: string;
  name?: string;
  description?: string;
  activeDaysOfWeek?: number[];

  // For updates, we support adding, updating, and removing nested entities
  days?: {
    create?: Array<{
      id?: string;
      name: string;
      description?: string;
    }>;
    update?: Array<{
      id: string;
      name?: string;
      description?: string;
    }>;
    delete?: string[]; // Array of IDs to delete
  };

  variants?: {
    create?: Array<{
      id?: string;
      name: string;
      description?: string;
      timeSlots: Array<{
        id?: string;
        name: string;
        start: string;
        end: string;
      }>;
    }>;
    update?: Array<{
      id: string;
      name?: string;
      description?: string;
      timeSlots?: {
        create?: Array<{
          id?: string;
          name: string;
          start: string;
          end: string;
        }>;
        update?: Array<{
          id: string;
          name?: string;
          start?: string;
          end?: string;
        }>;
        delete?: string[]; // Array of time slot IDs to delete
      };
    }>;
    delete?: string[]; // Array of variant IDs to delete
  };

  groups?: {
    create?: Array<{
      id?: string;
      name: string;
      description?: string;
    }>;
    update?: Array<{
      id: string;
      name?: string;
      description?: string;
    }>;
    delete?: string[]; // Array of group IDs to delete
  };

  // Rule set updates - replace entire rule sets for simplicity
  dayLabelRuleSet?: {
    id?: string;
    name: string;
    type: import('@repo/db').DayLabelRecurrenceRuleType;
    description?: string;
    seedDate?: string;

    dayOfWeekRules?: Array<{
      id?: string;
      dayOfWeek: number;
      scheduleDayName: string;
    }>;

    patternBasedRules?: Array<{
      id?: string;
      patternPosition: number;
      scheduleDayName: string;
    }>;
  };

  variantRuleSet?: {
    id?: string;
    name: string;
    description?: string;
    defaultVariantName: string;

    exceptions: Array<{
      id?: string;
      date: string;
      variantName: string;
    }>;
  };
}

