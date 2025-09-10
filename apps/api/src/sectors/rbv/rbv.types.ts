import {
  BellSchedule as PrismaBellSchedule,
  BellScheduleVariant as PrismaBellScheduleVariant,
  Period as PrismaPeriod,
} from '@repo/db'

export type BellSchedule = PrismaBellSchedule & {
  variants: BellScheduleVariant[];
};
export type UpsertBellScheduleInput = Omit<PrismaBellSchedule, 'id'> & {
  id?: BellSchedule['id'];
};
export interface DeleteBellScheduleInput {
  id: BellSchedule['id'];
}

export type BellScheduleVariant = PrismaBellScheduleVariant & {
  periods: Period[];
};
export type UpsertBellScheduleVariantInput = Omit<PrismaBellScheduleVariant, 'id'> & {
  id?: BellScheduleVariant['id'];
};
export interface DeleteBellScheduleVariantInput {
  id: BellScheduleVariant['id'];
}

export type Period = PrismaPeriod;
export type UpsertPeriodInput = Omit<PrismaPeriod, 'id'> & {
  id?: Period['id'];
};
export interface DeletePeriodInput {
  id: Period['id'];
}