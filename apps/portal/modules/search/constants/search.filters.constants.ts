export const SEARCH_EDITED_RANGE_VALUES = ['TODAY', 'LAST_SEVEN_DAYS', 'LAST_MONTH', 'THIS_YEAR'] as const;

export const SEARCH_EDITED_RANGE_LABEL_KEYS: Record<(typeof SEARCH_EDITED_RANGE_VALUES)[number], string> = {
  LAST_MONTH: 'lastMonth',
  LAST_SEVEN_DAYS: 'lastSevenDays',
  THIS_YEAR: 'thisYear',
  TODAY: 'today',
};

export const SEARCH_MAX_AUTHOR_QUERY_LENGTH = 128;
