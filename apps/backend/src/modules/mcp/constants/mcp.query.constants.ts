import { MCP_COMPUTED_COLUMNS_NOTE } from './mcp.formula.constants';

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
  'Dates that move with the day: in where, a date column takes @today, @yesterday, @tomorrow, @this_week, @last_week, @next_week, @this_month, @last_month, @next_month, @past_days:N and @next_days:N (the N days that end or start today).',
  'IS_BEFORE @today finds what is overdue; IS_ON_OR_BEFORE and IS_ON_OR_AFTER keep the day itself; a range of dates matches when it overlaps the days asked for.',
  'The same words work on created time and edited time. Weeks run from Monday to Sunday.',
  'They are read in the calendar of timeZone (an IANA name such as America/Santiago; UTC when left out), so pass the zone of the person you work for.',
  'Rows with nothing in a column do not match a condition that asks for a value, so an empty date is never overdue.',
  'What a calendar or a timeline shows: window { column, from, to } (days as YYYY-MM-DD) keeps the rows whose dates overlap those days, so a task that starts last month and ends inside the window is there. It adds to where and to the view.',
  'Mine: "@me" in a person, created-by or edited-by condition stands for the owner of your token, as for that person in the portal. Example: where [{ column: "Owner", operator: "CONTAINS", value: "@me" }].',
  'You can read the rows as one of its views shows them; where and sort given here replace its filter and order.',
  'The rows you are not allowed to read are never counted.',
  'Formula and rollup columns come with their value for each row, or an error object (code and message) when that cell could not be computed.',
  'A rollup counts and adds only the related rows you are allowed to read.',
  MCP_COMPUTED_COLUMNS_NOTE,
].join(' ');

export const MCP_CHANGES_DESCRIPTION = [
  'Follow a collection: the rows that changed since your last read, instead of reading the whole collection again.',
  'Start with query_collection and keep its changesCursor, or call this tool without since to get a cursor to watch from now.',
  'Then call it with since set to the cursor of your last read: you get the rows that changed (as they are now, with the columns you ask for), the ids of rows that went to the trash, and a new cursor to use next time.',
  'Rows repeat sometimes: a row you already hold is the same unless it differs. Compare total with the rows you hold: if they differ, a row was hidden from you or removed, so read again with query_collection.',
  'If reset is true, the cursor is no longer valid: read again with query_collection.',
  'waitSeconds makes the call wait for a change (up to 25 seconds) instead of answering empty, so you can wait without polling.',
  'If hasMore is true, call again with the cursor you got until it is false.',
  'possiblyChanged lists the rows whose rollup may have changed because a row it summarises changed while the row itself did not: compare them with what you hold. If possiblyChangedTruncated is true there were more, so read the rollup columns again with query_collection.',
  'Rows you are not allowed to read are never named or counted.',
].join(' ');

export const MCP_MOVE_NEEDS_A_PLACE_MESSAGE =
  'Say where the row goes: give before or after (another row of the view), and properties for the values it takes there.';

export const MCP_MOVE_ONE_NEIGHBOUR_MESSAGE = 'Give before or after, not both: a row goes beside one other row.';

export const MCP_MOVE_NO_RELATIONS_MESSAGE =
  'A move writes plain values; link and unlink relation rows with update_row instead.';
