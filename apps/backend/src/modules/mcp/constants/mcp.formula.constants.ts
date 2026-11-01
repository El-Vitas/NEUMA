/** The formula language, as an agent needs it to write one. It lives here because the agent reads tool descriptions. */
export const MCP_FORMULA_LANGUAGE = [
  'A formula is text that computes a value for each row from the other columns of that row.',
  'Read a column with prop("Column name") (its name as people see it, case does not matter). Text goes in double quotes, numbers are plain, true and false are the checkbox values.',
  'Operators: + - * / % (+ also joins text), == != < <= > >=, and or not (or && || !), and parentheses.',
  'Choose with if(condition, a, b); a and b must be of the same type.',
  'Numbers: abs ceil floor round(n, digits) sqrt pow(n, e) sign min(a, b, ...) max(a, b, ...) toNumber(x).',
  'Text: concat(a, b, ...) length lower upper trim contains(text, part) startsWith endsWith replace(text, find, with) replaceAll slice(text, from, to) format(x) join(list, separator) empty(x).',
  'Dates: now() today() date("2026-10-21") dateAdd(date, n, unit) dateSubtract(date, n, unit) dateBetween(later, earlier, unit) start(range) end(range) year month day weekday (Monday is 1) hour minute formatDate(date, "DD/MM/YYYY HH:mm") timestamp fromTimestamp. A unit is years, months, weeks, days, hours or minutes. now() and today() follow the time zone of the person who reads.',
  'Lists (a multi-select, a person, a relation or the original values of a rollup): length(list) join(list, ", ") contains(list, text) empty(list). There are no loops, no variables and no regular expressions.',
  'A formula gives one number, text, true or false, or date; it cannot give a list. An empty column gives an empty value that passes through arithmetic and comparisons, and empty(x), if and and or take it as it is.',
  'A formula can read other formulas and rollups of the same collection.',
].join(' ');

export const MCP_FORMULA_ERRORS = [
  'Saving refuses, with a code, a message and the position in the text: FORMULA_SYNTAX, FORMULA_UNKNOWN_FUNCTION and FORMULA_UNKNOWN_PROPERTY (with the closest names), FORMULA_TYPE_MISMATCH, FORMULA_CYCLE, FORMULA_TOO_LARGE, and PROPERTY_IN_USE when you remove or retype a column a formula or a rollup reads.',
  'A cell that cannot be computed shows an error instead of a value, and the rest of the row is fine: FORMULA_DIVISION_BY_ZERO, FORMULA_INVALID_ARGUMENT, FORMULA_WORK_LIMIT, FORMULA_DEPENDENCY_ERROR (it reads a cell that has an error) and ROLLUP_TARGET_UNAVAILABLE. A row with an error never matches a filter and goes last in an order.',
].join(' ');

export const MCP_ROLLUP_LANGUAGE = [
  'A rollup summarises one column of the rows a relation column links.',
  'Give the relation column, the column of the related collection to read, and the calculation: COUNT_ALL (how many related rows), COUNT_FILLED, COUNT_EMPTY, PERCENT_FILLED, PERCENT_EMPTY, SUM, AVERAGE, MEDIAN, MINIMUM, MAXIMUM (also the earliest and latest of a date), PERCENT_CHECKED (a checkbox) or SHOW_ORIGINAL (the values themselves; they can be read but not filtered, ordered or grouped).',
  'It counts only the related rows you are allowed to read. With no related rows a count and a sum are 0 and the rest are empty.',
].join(' ');

export const MCP_FORMULA_SHORT_HINT =
  'A formula column: its text, such as prop("Price") * prop("Quantity"). Try it first with test_formula, which explains the language and the errors.';

export const MCP_ROLLUP_SHORT_HINT =
  'A rollup column: the relation column to follow, the column of the related collection to read and the calculation (COUNT_ALL, COUNT_FILLED, COUNT_EMPTY, PERCENT_FILLED, PERCENT_EMPTY, SUM, AVERAGE, MEDIAN, MINIMUM, MAXIMUM, PERCENT_CHECKED, SHOW_ORIGINAL). test_formula checks it.';

export const MCP_COMPUTED_COLUMNS_NOTE = [
  'Formula and rollup columns are computed when read and cannot be written.',
  'You can filter, order, group and total by them like any other column; a query that does is limited to 20000 candidate rows, so narrow it with a filter on stored columns first if it is refused.',
].join(' ');

export const MCP_TEST_FORMULA_MISSING_KIND_MESSAGE =
  'Give formula (the text) or rollup (relation, property and calculation), one of them.';

export const MCP_TEST_FORMULA_DESCRIPTION = [
  'Check a formula or a rollup before saving it, without changing anything.',
  'Give the collection and either formula (text) or rollup (relation, property, calculation).',
  'You get the type it would produce, the columns it reads, and its value or error for up to 5 rows (the first ones, or the rows you name in rows, by id or title).',
  'With trace, a formula also returns the value of each part of the text, to find which part gives an unexpected value.',
  MCP_FORMULA_LANGUAGE,
  MCP_ROLLUP_LANGUAGE,
  MCP_FORMULA_ERRORS,
].join(' ');
