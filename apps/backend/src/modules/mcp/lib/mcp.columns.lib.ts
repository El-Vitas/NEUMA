import { DatabasePropertyType } from '@company-brain/db';
import { isPageCalendarDay, Result } from '@company-brain/shared';
import { MCP_ACCENT_MARKS, MCP_VALUELESS_FILTER_OPERATORS } from '../constants/mcp.constants';
import type { McpCellInput, McpCellValue, McpColumn, McpNameLister } from '../types/mcp.collections.types';
import type { McpPerson } from '../types/mcp.types';

/** Un nombre como se compara: sin acentos, sin mayúsculas y sin espacios de sobra. */
export const foldMcpName = (name: string): string =>
  name.normalize('NFD').replace(MCP_ACCENT_MARKS, '').toLowerCase().trim();

/** Una columna por su clave, o por el nombre que ve la gente, como sea que venga escrito. */
export const resolveMcpColumn = (columns: readonly McpColumn[], reference: string): McpColumn | null =>
  columns.find((column) => column.key === reference) ??
  columns.find((column) => foldMcpName(column.label) === foldMcpName(reference)) ??
  null;

/** Todos los nombres, para que el agente corrija en vez de adivinar. */
export const listMcpNames: McpNameLister = (names) => names.join(', ');

/** Ningún nombre: lo que hay en la colección es de quien puede leerla. */
export const hideMcpNames: McpNameLister = () => null;

/** Un rechazo, y después lo que sí hay si el agente puede saberlo. */
export const sayMcpRefusalWithNames = (
  said: string,
  kind: string,
  names: readonly string[],
  listNames: McpNameLister,
): string => {
  const listed = listNames(names);
  return listed === null ? said : `${said} Its ${kind} are: ${listed}.`;
};

/** Una columna nombrada como la ve la gente, o por qué no está y, si se puede saber, cuáles sí. */
export const requireMcpColumn = (
  columns: readonly McpColumn[],
  reference: string,
  listNames: McpNameLister,
): Result<McpColumn, string> => {
  const column = resolveMcpColumn(columns, reference);
  if (column !== null) return Result.ok(column);
  const names = columns.map((candidate) => `${candidate.label} (${candidate.key})`);
  return Result.fail(
    sayMcpRefusalWithNames(`The collection has no column "${reference}".`, 'columns', names, listNames),
  );
};

/** Los nombres de las opciones de una columna, como están escritos. */
export const listMcpOptionNames = (column: McpColumn): readonly string[] =>
  (column.options ?? []).map((option) => option.value);

/** Una opción de la columna tal como está escrita, aunque venga con otras mayúsculas o sin acentos. */
export const pickMcpOption = (column: McpColumn, value: string, listNames: McpNameLister): Result<string, string> => {
  const option = (column.options ?? []).find((candidate) => foldMcpName(candidate.value) === foldMcpName(value));
  if (option !== undefined) return Result.ok(option.value);
  return Result.fail(
    sayMcpRefusalWithNames(
      `${column.label} has no option "${value}".`,
      'options',
      listMcpOptionNames(column),
      listNames,
    ),
  );
};

/**
 * Una persona por su id, o por su nombre si nadie más se llama igual. Con dos
 * del mismo nombre se pide el id: elegir una dejaría la fila a nombre de otra.
 */
const pickPerson = (column: McpColumn, value: string, people: readonly McpPerson[]): Result<string, string> => {
  const byId = people.find((candidate) => candidate.id === value);
  if (byId !== undefined) return Result.ok(byId.id);
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
  listNames: McpNameLister,
): Result<McpCellValue, string> => {
  if (input === null) return Result.ok(null);
  switch (column.type) {
    case DatabasePropertyType.TITLE:
      return Result.fail('The title is not a property: set it with title.');
    case DatabasePropertyType.SELECT:
    case DatabasePropertyType.MULTI_SELECT:
      return pickEach(input, (value) => pickMcpOption(column, value, listNames));
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
  condition: { readonly operator: string; readonly value?: McpCellInput | undefined },
  people: readonly McpPerson[],
  listNames: McpNameLister,
): Result<McpCellValue, string> => {
  const { operator, value: input } = condition;
  if (MCP_VALUELESS_FILTER_OPERATORS.includes(operator)) return Result.ok(null);
  if (input === undefined || input === null) return Result.fail(`${column.label} ${operator} needs a value.`);
  if (column.type === DatabasePropertyType.TITLE)
    return typeof input === 'string' ? Result.ok(input) : Result.fail(`${column.label} takes text.`);
  return readCellValue(column, input, people, listNames);
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
 * Aquí se traducen a lo que se guarda. Lo que no calza se rechaza entero y,
 * si el token puede leer la colección, diciendo qué sí vale, para que el
 * agente corrija en vez de adivinar; nunca se guarda a medias.
 */
export const normalizeMcpCellValues = (
  columns: readonly McpColumn[],
  values: Readonly<Record<string, McpCellInput>>,
  people: readonly McpPerson[],
  listNames: McpNameLister,
): Result<Record<string, McpCellValue>, string> => {
  const normalized: Record<string, McpCellValue> = {};
  for (const [reference, input] of Object.entries(values)) {
    const column = requireMcpColumn(columns, reference, listNames);
    if (column.isFail()) return Result.fail(column.getError());
    const value = readCellValue(column.getValue(), input, people, listNames);
    if (value.isFail()) return Result.fail(value.getError());
    normalized[column.getValue().key] = value.getValue();
  }
  return Result.ok(normalized);
};
