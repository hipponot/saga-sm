import { ID } from '../base.types';

export interface BellScheduleDB {
  id: ID;
  name: string;
  description?: string;
  variant_ids: ID[];
}
export type BellSchedule = Omit<BellScheduleDB, 'variant_ids'> & {
  variants: BellScheduleVariant[];
};
export type UpsertBellScheduleInput = Omit<BellSchedule, 'id' | 'variants'> & Partial<Pick<BellSchedule, 'id'>>;
export interface DeleteBellScheduleInput {
  id: ID;
}

export interface BellScheduleVariantDB {
  id: ID;
  name: string;
  description?: string;
  isDefault?: boolean;

  recurrenceRuleSet: string;
  period_ids: ID[];
}
export type BellScheduleVariant = Omit<BellScheduleVariantDB, 'period_ids'> & {
  periods: Period[];
};
export type CreateBellScheduleVariantInput =
  Omit<BellScheduleVariant, 'id'> &
  Partial<Pick<BellScheduleVariant, 'id'>> &
  {
    schedule_id: ID;
  }
export interface DeleteBellScheduleVariantInput {
  schedule_id: ID;
  variant_id: ID;
}

export interface Period {
  id: string;
  name: string;
  start: string; // HH:MM format (e.g., "08:00")
  end: string;   // HH:MM format (e.g., "09:00")
}
export type CreatePeriodInput = Omit<Period, 'id'> & Partial<Pick<Period, 'id'>>;