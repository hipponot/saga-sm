/* eslint-disable @typescript-eslint/naming-convention */
import { Factory } from "fishery";
import { LocalDate, LocalTime } from "@js-joda/core";

export interface DateRangeFactoryTransientParams {
  start_date?: LocalDate;
  duration_days?: number;
}

export interface TimeRangeFactoryTransientParams {
  start_time?: LocalTime;
  duration_ms?: number;
}

/**
 * Factory for DateTimeRange objects.
 */
export const LocalDateRangeFactory = Factory.define<
  { start: LocalDate; end: LocalDate },
  DateRangeFactoryTransientParams
>(({ sequence, transientParams }) => {
  const start_date = transientParams.start_date ?? LocalDate.now();
  const duration_days = transientParams.duration_days ?? 1;

  const start = start_date.plusDays(sequence - 1);
  const end = start.plusDays(duration_days);

  return { start, end };
});

export const LocalTimeRangeFactory = Factory.define<
  { start: LocalTime; end: LocalTime },
  TimeRangeFactoryTransientParams
>(({ sequence, transientParams }) => {
  const start_time = transientParams.start_time ?? LocalTime.now();
  const duration_ms = transientParams.duration_ms ?? 60 * 60 * 1000;

  const start = start_time.plusHours((sequence - 1) * 24);
  const end = start.plusSeconds(duration_ms / 1000);

  return { start, end };
});

/**
 * Randomly selects one value from an enum.
 * @param enumObj - The enum object to select from
 * @returns A random enum value
 */
export function oneOf<T extends Record<string, string | number>>(
  enumObj: T,
): T[keyof T] {
  const values = Object.values(enumObj) as T[keyof T][];
  const randomIndex = Math.floor(Math.random() * values.length);
  return values[randomIndex];
}

/**
 * Randomly selects one value from an array.
 * @param array - The array to select from
 * @returns A random array element
 */
export function oneOfArray<T>(array: readonly T[]): T {
  if (array.length === 0) {
    throw new Error("Cannot select from empty array");
  }
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}
