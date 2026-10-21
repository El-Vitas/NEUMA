/** What a date condition can be set to: an exact day, a relative word, or a count of days before or after today. */
export type PageFilterDateChoice =
  | '@last_month'
  | '@last_week'
  | '@next_month'
  | '@next_week'
  | '@this_month'
  | '@this_week'
  | '@today'
  | '@tomorrow'
  | '@yesterday'
  | 'EXACT'
  | 'NEXT_DAYS'
  | 'PAST_DAYS';

export interface PageFilterDateReading {
  readonly choice: PageFilterDateChoice;
  readonly days: null | number;
}

export type PageFilterValueKind =
  | 'BOOLEAN'
  | 'DATE'
  | 'NONE'
  | 'NUMBER'
  | 'OPTION'
  | 'PERSON'
  | 'STATUS_GROUP'
  | 'TEXT';
