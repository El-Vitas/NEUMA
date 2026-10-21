import { DatabasePropertyType } from '@neuma/db';
import type { PageDateValue, PagePropertyOptionDraft } from '@neuma/shared';
import {
  isPageCalendarDay,
  isValidPageDateValue,
  isValidPageEmail,
  isValidPagePhone,
  isValidPageUrl,
  PAGE_NUMBER_FORMAT,
  PAGE_STATUS_GROUP_VALUES,
  percentToFraction,
  Result,
} from '@neuma/shared';
import {
  MCP_ACCENT_MARKS,
  MCP_STATUS_GROUP_OPERATORS,
  MCP_VALUELESS_FILTER_OPERATORS,
} from '../constants/mcp.constants';
import type {
  McpCellInput,
  McpCellValue,
  McpColumnDraft,
  McpConditionValue,
  McpNameLister,
  McpRelationInput,
  McpRelationRequest,
} from '../types/mcp.collections.types';
import type { McpAssignablePerson } from '../types/mcp.types';

export const foldMcpName = (name: string): string =>
  name.normalize('NFD').replace(MCP_ACCENT_MARKS, '').toLowerCase().trim();

export const resolveMcpColumn = (columns: readonly McpColumnDraft[], reference: string): McpColumnDraft | null =>
  columns.find((column) => column.key === reference) ??
  columns.find((column) => foldMcpName(column.label) === foldMcpName(reference)) ??
  null;

export const listMcpNames: McpNameLister = (names) => names.join(', ');

/** Names in a collection belong to whoever can read it. */
export const hideMcpNames: McpNameLister = () => null;

export const sayMcpRefusalWithNames = (
  said: string,
  kind: string,
  names: readonly string[],
  listNames: McpNameLister,
): string => {
  const listed = listNames(names);
  return listed === null ? said : `${said} Its ${kind} are: ${listed}.`;
};

export const requireMcpColumn = (
  columns: readonly McpColumnDraft[],
  reference: string,
  listNames: McpNameLister,
): Result<McpColumnDraft, string> => {
  const column = resolveMcpColumn(columns, reference);
  if (column !== null) return Result.ok(column);
  const names = columns.map((candidate) => `${candidate.label} (${candidate.key})`);
  return Result.fail(
    sayMcpRefusalWithNames(`The collection has no column "${reference}".`, 'columns', names, listNames),
  );
};

export const listMcpOptionNames = (column: McpColumnDraft): readonly string[] =>
  (column.options ?? []).map((option) => option.value);

/** An agent names an option by what people read, or by the id a read gave it; the option is found by either. */
export const findMcpOption = (
  column: McpColumnDraft,
  value: string,
  listNames: McpNameLister,
): Result<PagePropertyOptionDraft, string> => {
  const options = column.options ?? [];
  const option =
    options.find((candidate) => foldMcpName(candidate.value) === foldMcpName(value)) ??
    options.find((candidate) => candidate.id === value);
  if (option !== undefined) return Result.ok(option);
  return Result.fail(
    sayMcpRefusalWithNames(
      `${column.label} has no option "${value}".`,
      'options',
      listMcpOptionNames(column),
      listNames,
    ),
  );
};

/** What a row stores for an option is its id, so a rename never moves a row. */
export const pickMcpOption = (
  column: McpColumnDraft,
  value: string,
  listNames: McpNameLister,
): Result<string, string> => {
  const option = findMcpOption(column, value, listNames);
  if (option.isFail()) return Result.fail(option.getError());
  const { id } = option.getValue();
  return id === null
    ? Result.fail(`${column.label}: "${value}" was just added. Save the collection first.`)
    : Result.ok(id);
};

/** With two people of the same name the id is required: picking one would assign the row to the wrong person. */
export const pickPerson = (
  column: McpColumnDraft,
  value: string,
  people: readonly McpAssignablePerson[],
): Result<string, string> => {
  const byId = people.find((candidate) => candidate.id === value);
  if (byId !== undefined) return Result.ok(byId.id);
  const byEmail = people.find((candidate) => foldMcpName(candidate.email) === foldMcpName(value));
  if (byEmail !== undefined) return Result.ok(byEmail.id);
  const named = people.filter((candidate) => foldMcpName(candidate.name) === foldMcpName(value));
  const [person, namesake] = named;
  if (person === undefined) return Result.fail(`${column.label}: there is nobody called "${value}" in the workspace.`);
  if (namesake !== undefined)
    return Result.fail(
      `${column.label}: there is more than one person called "${value}" in the workspace. Name the person by their id: query_collection shows each person on a row with their id.`,
    );
  return Result.ok(person.id);
};

const listInputValues = (input: McpCellInput): readonly string[] => {
  if (typeof input === 'string') return [input];
  return typeof input === 'object' && input !== null && 'length' in input ? input : [];
};

const pickEach = (
  input: McpCellInput,
  pick: (value: string) => Result<string, string>,
): Result<string | string[], string> => {
  const picked = listInputValues(input).map(pick);
  const failed = picked.find((result) => result.isFail());
  if (failed !== undefined) return Result.fail(failed.getError());
  const chosen = picked.map((result) => result.getValue());
  return Result.ok(typeof input === 'string' ? (chosen[0] ?? '') : chosen);
};

/** A percent column takes the number as people read it, 25 for 25 %, and the row stores the fraction. */
const readNumber = (column: McpColumnDraft, input: McpCellInput): Result<number, string> => {
  const number = typeof input === 'number' ? input : Number(input);
  if (typeof input === 'boolean' || input === '' || !Number.isFinite(number)) {
    return Result.fail(`${column.label} takes a number.`);
  }
  return Result.ok(column.config.numberFormat === PAGE_NUMBER_FORMAT.PERCENT ? percentToFraction(number) : number);
};

/** One day, `2026-10-20`, or a range written as an interval, `2026-10-20/2026-10-25`. */
const readDate = (column: McpColumnDraft, input: McpCellInput): Result<PageDateValue, string> => {
  const message = `${column.label} takes a date as YYYY-MM-DD, or a range as YYYY-MM-DD/YYYY-MM-DD.`;
  if (typeof input !== 'string') return Result.fail(message);
  const [start, end, extra] = input.split('/');
  if (start === undefined || extra !== undefined) return Result.fail(message);
  const date: PageDateValue = end === undefined ? { start } : { end, start };
  return isValidPageDateValue(date) ? Result.ok(date) : Result.fail(message);
};

const readTextLike = (
  column: McpColumnDraft,
  input: McpCellInput,
  isValid: (text: string) => boolean,
  shape: string,
): Result<string, string> =>
  typeof input === 'string' && (input === '' || isValid(input))
    ? Result.ok(input)
    : Result.fail(`${column.label} takes ${shape}.`);

const sayCannotWrite = (column: McpColumnDraft): string =>
  `${column.label} is filled in by Neuma: it cannot be written.`;

/** Files are the ids of files already uploaded to Neuma; a name would not say which of two files is meant. */
const readFileIds = (column: McpColumnDraft, input: McpCellInput): Result<string[], string> => {
  const ids = typeof input === 'string' ? [input] : input;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string' || id.trim() === '')) {
    return Result.fail(`${column.label} takes a list of file ids.`);
  }
  return Result.ok([...new Set<string>(ids)]);
};

const asList = (result: Result<string | string[], string>): Result<McpCellValue, string> =>
  result.isFail() ? Result.fail(result.getError()) : Result.ok([result.getValue()].flat());

const readCellValue = (
  column: McpColumnDraft,
  input: McpCellInput,
  people: readonly McpAssignablePerson[],
  listNames: McpNameLister,
): Result<McpCellValue, string> => {
  if (input === null) return Result.ok(null);
  switch (column.type) {
    case DatabasePropertyType.TITLE:
      return Result.fail('The title is not a property: set it with title.');
    case DatabasePropertyType.SELECT:
    case DatabasePropertyType.STATUS:
      return typeof input === 'string'
        ? pickMcpOption(column, input, listNames)
        : Result.fail(`${column.label} takes the name of one option.`);
    case DatabasePropertyType.MULTI_SELECT:
      return asList(pickEach(input, (value) => pickMcpOption(column, value, listNames)));
    case DatabasePropertyType.PERSON:
      return asList(pickEach(input, (value) => pickPerson(column, value, people)));
    case DatabasePropertyType.NUMBER:
      return readNumber(column, input);
    case DatabasePropertyType.CHECKBOX:
      return typeof input === 'boolean' ? Result.ok(input) : Result.fail(`${column.label} takes true or false.`);
    case DatabasePropertyType.DATE:
      return readDate(column, input);
    case DatabasePropertyType.URL:
      return readTextLike(column, input, isValidPageUrl, 'a web address that starts with http:// or https://');
    case DatabasePropertyType.EMAIL:
      return readTextLike(column, input, isValidPageEmail, 'an email address');
    case DatabasePropertyType.PHONE:
      return readTextLike(column, input, isValidPagePhone, 'a phone number');
    case DatabasePropertyType.FILES:
      return readFileIds(column, input);
    case DatabasePropertyType.RELATION:
    case DatabasePropertyType.CREATED_TIME:
    case DatabasePropertyType.EDITED_TIME:
    case DatabasePropertyType.CREATED_BY:
    case DatabasePropertyType.EDITED_BY:
    case DatabasePropertyType.UNIQUE_ID:
      return Result.fail(sayCannotWrite(column));
    default:
      return typeof input === 'string' ? Result.ok(input) : Result.fail(`${column.label} takes text.`);
  }
};

/** The group of a status is named by its fixed name: TO_DO, IN_PROGRESS or COMPLETE. */
const readStatusGroup = (column: McpColumnDraft, input: McpCellInput): Result<string, string> => {
  const group =
    typeof input === 'string' ? PAGE_STATUS_GROUP_VALUES.find((candidate) => candidate === input) : undefined;
  return group === undefined
    ? Result.fail(`${column.label}: a group is ${PAGE_STATUS_GROUP_VALUES.join(', ')}.`)
    : Result.ok(group);
};

/** A date to compare against is a day: the condition looks at the day, not at a range. */
const readConditionDay = (column: McpColumnDraft, input: McpCellInput): Result<string, string> =>
  typeof input === 'string' && isPageCalendarDay(input)
    ? Result.ok(input)
    : Result.fail(`${column.label} compares with a date as YYYY-MM-DD.`);

const readConditionOperand = (
  column: McpColumnDraft,
  operator: string,
  input: McpCellInput,
  people: readonly McpAssignablePerson[],
  listNames: McpNameLister,
): Result<McpConditionValue, string> => {
  if (column.type === DatabasePropertyType.STATUS && MCP_STATUS_GROUP_OPERATORS.includes(operator)) {
    return readStatusGroup(column, input);
  }
  switch (column.type) {
    case DatabasePropertyType.DATE:
    case DatabasePropertyType.CREATED_TIME:
    case DatabasePropertyType.EDITED_TIME:
      return readConditionDay(column, input);
    case DatabasePropertyType.PERSON:
    case DatabasePropertyType.CREATED_BY:
    case DatabasePropertyType.EDITED_BY:
      return typeof input === 'string'
        ? pickPerson(column, input, people)
        : Result.fail(`${column.label} takes a person.`);
    case DatabasePropertyType.MULTI_SELECT:
      return typeof input === 'string'
        ? pickMcpOption(column, input, listNames)
        : Result.fail(`${column.label} compares with the name of one option.`);
    case DatabasePropertyType.RELATION:
      return typeof input === 'string' ? Result.ok(input) : Result.fail(`${column.label} takes the id of a row.`);
    case DatabasePropertyType.UNIQUE_ID:
      return readNumber(column, input);
    default:
      return toConditionValue(readCellValue(column, input, people, listNames));
  }
};

/** A condition compares with a plain value; a range is a cell, not something to compare against. */
const toConditionValue = (cell: Result<McpCellValue, string>): Result<McpConditionValue, string> => {
  if (cell.isFail()) return Result.fail(cell.getError());
  const value = cell.getValue();
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? Result.fail('A condition compares with one value, not a range.')
    : Result.ok(value);
};

/** An emptiness condition carries no value; a title condition compares the raw text. */
export const readMcpConditionValue = (
  column: McpColumnDraft,
  condition: { readonly operator: string; readonly value?: McpCellInput | undefined },
  people: readonly McpAssignablePerson[],
  listNames: McpNameLister,
): Result<McpConditionValue, string> => {
  const { operator, value: input } = condition;
  if (MCP_VALUELESS_FILTER_OPERATORS.includes(operator)) return Result.ok(null);
  if (input === undefined || input === null) return Result.fail(`${column.label} ${operator} needs a value.`);
  if (column.type === DatabasePropertyType.TITLE)
    return typeof input === 'string' ? Result.ok(input) : Result.fail(`${column.label} takes text.`);
  return readConditionOperand(column, operator, input, people, listNames);
};

export const keepFilledMcpCells = (
  values: Readonly<Record<string, McpCellValue>>,
): Record<string, Exclude<McpCellValue, null>> =>
  Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, Exclude<McpCellValue, null>] => entry[1] !== null),
  );

const isRelationInput = (input: McpCellInput): input is McpRelationInput =>
  typeof input === 'object' && input !== null && !Array.isArray(input);

const readReferences = (column: McpColumnDraft, input: unknown): Result<readonly string[], string> => {
  if (input === undefined) return Result.ok([]);
  const references = typeof input === 'string' ? [input] : input;
  if (!Array.isArray(references) || references.some((entry) => typeof entry !== 'string' || entry.trim() === '')) {
    return Result.fail(`${column.label} takes rows by their id or their title.`);
  }
  return Result.ok(references.map((entry: string) => entry.trim()));
};

/**
 * A relation cell is `{ add, remove }` to link and unlink rows, or a list (or one row) that replaces what it
 * has, or null to empty it. Rows are named by page id or by title.
 */
const readRelationRequest = (column: McpColumnDraft, input: McpCellInput): Result<McpRelationRequest, string> => {
  if (input === null) return Result.ok({ add: [], column, remove: [], set: [] });
  if (!isRelationInput(input)) {
    const set = readReferences(column, input);
    return set.isFail() ? Result.fail(set.getError()) : Result.ok({ add: [], column, remove: [], set: set.getValue() });
  }
  const add = readReferences(column, input.add);
  if (add.isFail()) return Result.fail(add.getError());
  const remove = readReferences(column, input.remove);
  if (remove.isFail()) return Result.fail(remove.getError());
  return Result.ok({ add: add.getValue(), column, remove: remove.getValue(), set: null });
};

/** Relations are not written with the other cells: they are linked row by row, so they are read apart. */
export const readMcpRelationRequests = (
  columns: readonly McpColumnDraft[],
  values: Readonly<Record<string, McpCellInput>>,
  listNames: McpNameLister,
): Result<McpRelationRequest[], string> => {
  const requests: McpRelationRequest[] = [];
  for (const [reference, input] of Object.entries(values)) {
    const column = requireMcpColumn(columns, reference, listNames);
    if (column.isFail()) return Result.fail(column.getError());
    if (column.getValue().type !== DatabasePropertyType.RELATION) continue;
    const request = readRelationRequest(column.getValue(), input);
    if (request.isFail()) return Result.fail(request.getError());
    requests.push(request.getValue());
  }
  return Result.ok(requests);
};

/** Rejects the whole row on any mismatch, listing valid names when the token can read; never saves partially. */
export const normalizeMcpCellValues = (
  columns: readonly McpColumnDraft[],
  values: Readonly<Record<string, McpCellInput>>,
  people: readonly McpAssignablePerson[],
  listNames: McpNameLister,
): Result<Record<string, McpCellValue>, string> => {
  const normalized: Record<string, McpCellValue> = {};
  for (const [reference, input] of Object.entries(values)) {
    const column = requireMcpColumn(columns, reference, listNames);
    if (column.isFail()) return Result.fail(column.getError());
    if (column.getValue().type === DatabasePropertyType.RELATION) continue;
    const value = readCellValue(column.getValue(), input, people, listNames);
    if (value.isFail()) return Result.fail(value.getError());
    normalized[column.getValue().key] = value.getValue();
  }
  return Result.ok(normalized);
};
