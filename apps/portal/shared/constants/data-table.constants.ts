/** One empty list for every table, so a table with no data yet does not see a new array each render. */
export const DATA_TABLE_NO_ROWS: never[] = [];

export const DATA_TABLE_FILTER_VARIANTS = [
  'text',
  'number',
  'range',
  'date',
  'dateRange',
  'boolean',
  'select',
  'multiSelect',
] as const;
