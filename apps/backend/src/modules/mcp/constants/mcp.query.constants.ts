/** What an agent reads for rows that have no value in the column it groups by, and writes to ask for that group. */
export const MCP_NO_VALUE_GROUP_NAME = '(no value)';

/** The ids the answer of the portal's query is read back by. */
export const MCP_ROWS_REDUCER_ID = 'rows';
export const MCP_COUNTS_REDUCER_ID = 'counts';
export const MCP_TOTAL_ITEM_ID = 'total';

/** A few rows that hold the words, enough to tell which one was meant; never the whole collection. */
export const MCP_RELATION_SEARCH_LIMIT = 25;

export const MCP_QUERY_DESCRIPTION = [
  'Find and count the rows of a collection: the open tasks of a person, what is due this week, what is blocked.',
  'Name columns, options and people as they appear in get_collection.',
  'Ask for as little as you need.',
  'Only a count: limit 0, with where if you want a part of the rows, and the answer is just how many match.',
  'Counts by group: groupBy a column with limit 0 gives each group and its size, for a thousand rows as for ten.',
  'One group: groupBy with group "In progress" returns the rows of that group, a part at a time with the cursor.',
  'A page of rows: limit and cursor, and columns to bring only the columns you need (the title is always there).',
  'Totals over every matching row, not only the returned ones: aggregate with SUM, AVERAGE, COUNT_EMPTY and so on.',
  'You can read the rows as one of its views shows them; where and sort given here replace its filter and order.',
  'The rows you are not allowed to read are never counted.',
].join(' ');

export const MCP_MOVE_NEEDS_A_PLACE_MESSAGE =
  'Say where the row goes: give before or after (another row of the view), and properties for the values it takes there.';

export const MCP_MOVE_ONE_NEIGHBOUR_MESSAGE = 'Give before or after, not both: a row goes beside one other row.';

export const MCP_MOVE_NO_RELATIONS_MESSAGE =
  'A move writes plain values; link and unlink relation rows with update_row instead.';
