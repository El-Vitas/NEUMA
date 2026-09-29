import { DatabasePropertyType } from '@company-brain/db';
import { isPageCalendarDay, Result } from '@company-brain/shared';
import { MCP_ACCENT_MARKS, MCP_VALUELESS_FILTER_OPERATORS } from '../constants/mcp.constants';
import type { McpCellInput, McpCellValue, McpColumn } from '../types/mcp.collections.types';
import type { McpPerson } from '../types/mcp.types';

/** Un nombre como se compara: sin acentos, sin mayúsculas y sin espacios de sobra. */
export const foldMcpName = (name: string): string =>
  name.normalize('NFD').replace(MCP_ACCENT_MARKS, '').toLowerCase().trim();

/** Una columna por su clave, o por el nombre que ve la gente, como sea que venga escrito. */
export const resolveMcpColumn = (columns: readonly McpColumn[], reference: string): McpColumn | null =>
  columns.find((column) => column.key === reference) ??
  columns.find((column) => foldMcpName(column.label) === foldMcpName(reference)) ??
  null;

export const describeMcpColumns = (columns: readonly McpColumn[]): string =>
  columns.map((column) => `${column.label} (${column.key})`).join(', ');

/** Una columna nombrada como la ve la gente, o por qué no está y cuáles sí. */
export const requireMcpColumn = (columns: readonly McpColumn[], reference: string): Result<McpColumn, string> => {
  const column = resolveMcpColumn(columns, reference);
  return column === null
    ? Result.fail(`The collection has no column "${reference}". Its columns are: ${describeMcpColumns(columns)}.`)
    : Result.ok(column);
};

export const describeMcpOptions = (column: McpColumn): string =>
  (column.options ?? []).map((option) => option.value).join(', ');

/** Una opción de la columna tal como está escrita, aunque venga con otras mayúsculas o sin acentos. */
export const pickMcpOption = (column: McpColumn, value: string): Result<string, string> => {
  const option = (column.options ?? []).find((candidate) => foldMcpName(candidate.value) === foldMcpName(value));
  return option === undefined
    ? Result.fail(`${column.label} has no option "${value}". Its options are: ${describeMcpOptions(column)}.`)
    : Result.ok(option.value);
};

const pickPerson = (column: McpColumn, value: string, people: readonly McpPerson[]): Result<string, string> => {
  const person =
    people.find((candidate) => candidate.id === value) ??
    people.find((candidate) => foldMcpName(candidate.name) === foldMcpName(value));
  return person === undefined
    ? Result.fail(`${column.label}: there is nobody called "${value}" in the workspace.`)
    : Result.ok(person.id);
};

const listInputValues = (input: McpCellInput): readonly string[] => {
  if (typeof input === 'string') return [input];
  return typeof input === 'object' && input !== null ? input : [];
};

/** Aplica a uno o a varios valores la misma elección, y falla con el primero que no calce. */
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

const readNumber = (column: McpColumn, input: McpCellInput): Result<number, string> => {
  const number = typeof input === 'number' ? input : Number(input);
  return typeof input !== 'boolean' && input !== '' && Number.isFinite(number)
    ? Result.ok(number)
    : Result.fail(`${column.label} takes a number.`);
};

const readCellValue = (
  column: McpColumn,
  input: McpCellInput,
  people: readonly McpPerson[],
): Result<McpCellValue, string> => {
  if (input === null) return Result.ok(null);
  switch (column.type) {
    case DatabasePropertyType.TITLE:
      return Result.fail('The title is not a property: set it with title.');
    case DatabasePropertyType.SELECT:
    case DatabasePropertyType.MULTI_SELECT:
      return pickEach(input, (value) => pickMcpOption(column, value));
    case DatabasePropertyType.PERSON:
      return pickEach(input, (value) => pickPerson(column, value, people));
    case DatabasePropertyType.NUMBER:
      return readNumber(column, input);
    case DatabasePropertyType.CHECKBOX:
      return typeof input === 'boolean' ? Result.ok(input) : Result.fail(`${column.label} takes true or false.`);
    case DatabasePropertyType.DATE:
      return typeof input === 'string' && isPageCalendarDay(input)
        ? Result.ok(input)
        : Result.fail(`${column.label} takes a date as YYYY-MM-DD.`);
    default:
      return typeof input === 'string' ? Result.ok(input) : Result.fail(`${column.label} takes text.`);
  }
};

/**
 * El valor con que una condición compara, como lo guarda la colección. Una
 * condición sobre si la celda está vacía no lleva valor; una sobre el título
 * compara con el texto tal cual.
 */
export const readMcpConditionValue = (
  column: McpColumn,
  operator: string,
  input: McpCellInput | undefined,
  people: readonly McpPerson[],
): Result<McpCellValue, string> => {
  if (MCP_VALUELESS_FILTER_OPERATORS.includes(operator)) return Result.ok(null);
  if (input === undefined || input === null) return Result.fail(`${column.label} ${operator} needs a value.`);
  if (column.type === DatabasePropertyType.TITLE)
    return typeof input === 'string' ? Result.ok(input) : Result.fail(`${column.label} takes text.`);
  return readCellValue(column, input, people);
};

/** Las celdas que dicen algo: una fila nueva no guarda las que nacen vacías. */
export const keepFilledMcpCells = (
  values: Readonly<Record<string, McpCellValue>>,
): Record<string, Exclude<McpCellValue, null>> =>
  Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, Exclude<McpCellValue, null>] => entry[1] !== null),
  );

/**
 * Lo que el agente quiere poner en una fila, como lo guarda la colección.
 *
 * El agente nombra las columnas y los valores como los ve una persona: la
 * columna por su nombre, la opción por su nombre, la persona por su nombre.
 * Aquí se traducen a lo que se guarda. Lo que no calza se rechaza entero y
 * diciendo qué sí vale, para que el agente corrija en vez de adivinar; nunca
 * se guarda a medias.
 */
export const normalizeMcpCellValues = (
  columns: readonly McpColumn[],
  values: Readonly<Record<string, McpCellInput>>,
  people: readonly McpPerson[],
): Result<Record<string, McpCellValue>, string> => {
  const normalized: Record<string, McpCellValue> = {};
  for (const [reference, input] of Object.entries(values)) {
    const column = requireMcpColumn(columns, reference);
    if (column.isFail()) return Result.fail(column.getError());
    const value = readCellValue(column.getValue(), input, people);
    if (value.isFail()) return Result.fail(value.getError());
    normalized[column.getValue().key] = value.getValue();
  }
  return Result.ok(normalized);
};
