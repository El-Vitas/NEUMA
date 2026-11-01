import {
  PAGE_RELATIVE_DATE_VALUES,
  PAGE_RELATIVE_MAXIMUM_DAYS,
  PAGE_RELATIVE_NEXT_DAYS_PREFIX,
  PAGE_RELATIVE_PAST_DAYS_PREFIX,
  readPageRelativeDate,
} from '@neuma/shared';
import type { PageFilterDateChoice, PageFilterDateReading } from '../types/pages.filter-value.types';

export const listFilterDateChoices = (): readonly PageFilterDateChoice[] => [
  'EXACT',
  ...PAGE_RELATIVE_DATE_VALUES,
  'PAST_DAYS',
  'NEXT_DAYS',
];

/** What a date condition holds, as the choice it stands for in the picker and the number of days that goes with it. */
export const readFilterDateChoice = (value: unknown): PageFilterDateReading => {
  const relative = typeof value === 'string' ? readPageRelativeDate(value) : null;
  if (typeof value !== 'string' || relative === null) return { choice: 'EXACT', days: null };
  if (relative.kind === 'PAST_DAYS') return { choice: 'PAST_DAYS', days: relative.count };
  if (relative.kind === 'NEXT_DAYS') return { choice: 'NEXT_DAYS', days: relative.count };
  const fixed = PAGE_RELATIVE_DATE_VALUES.find((candidate) => candidate === value);
  return fixed === undefined ? { choice: 'EXACT', days: null } : { choice: fixed, days: null };
};

/** The day on the clock of the person, as `YYYY-MM-DD`: a date they pick starts where they are. */
export const readLocalDay = (moment: Date): string =>
  `${String(moment.getFullYear()).padStart(4, '0')}-${String(moment.getMonth() + 1).padStart(2, '0')}-${String(moment.getDate()).padStart(2, '0')}`;

const clampDays = (days: number): number => Math.min(PAGE_RELATIVE_MAXIMUM_DAYS, Math.max(1, Math.trunc(days)));

/** The stored value of a choice. `today` is the day an exact date starts at when the person picks that choice. */
export const buildFilterDateValue = (choice: PageFilterDateChoice, days: null | number, today: string): string => {
  switch (choice) {
    case 'EXACT':
      return today;
    case 'PAST_DAYS':
      return `${PAGE_RELATIVE_PAST_DAYS_PREFIX}${String(clampDays(days ?? 1))}`;
    case 'NEXT_DAYS':
      return `${PAGE_RELATIVE_NEXT_DAYS_PREFIX}${String(clampDays(days ?? 1))}`;
    default:
      return choice;
  }
};
