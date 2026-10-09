import { DatabasePropertyType } from '@company-brain/db';
import { buildPagePropertyKey, pickPageOptionColor, Result } from '@company-brain/shared';
import type {
  McpColumn,
  McpColumnChanges,
  McpColumnChangesPlan,
  McpColumnStep,
  McpColumnsInHand,
  McpNameLister,
  McpOptionRewrite,
} from '../types/mcp.collections.types';
import {
  hideMcpNames,
  listMcpOptionNames,
  pickMcpOption,
  requireMcpColumn,
  sayMcpRefusalWithNames,
} from './mcp.columns.lib';

const withColors = (values: readonly string[], firstIndex: number) =>
  values.map((value, at) => ({ color: pickPageOptionColor(firstIndex + at), value }));

const addColumns: McpColumnStep = (columns, changes) => {
  const added = [...columns];
  for (const column of changes.addColumns ?? []) {
    added.push({
      key: buildPagePropertyKey(column.name, added),
      label: column.name,
      options: column.options === undefined ? null : withColors(column.options, 0),
      required: false,
      type: column.type,
    });
  }
  return Result.ok(added);
};

const renameColumns: McpColumnStep = (columns, changes, listNames) => {
  let renamed = [...columns];
  for (const change of changes.renameColumns ?? []) {
    const column = requireMcpColumn(renamed, change.column, listNames);
    if (column.isFail()) return Result.fail(column.getError());
    const key = column.getValue().key;
    renamed = renamed.map((candidate) => (candidate.key === key ? { ...candidate, label: change.name } : candidate));
  }
  return Result.ok(renamed);
};

const removeColumns: McpColumnStep = (columns, changes, listNames) => {
  let kept = [...columns];
  for (const reference of changes.removeColumns ?? []) {
    const column = requireMcpColumn(kept, reference, listNames);
    if (column.isFail()) return Result.fail(column.getError());
    if (column.getValue().type === DatabasePropertyType.TITLE)
      return Result.fail('The title column cannot be removed: every row needs a title.');
    kept = kept.filter((candidate) => candidate.key !== column.getValue().key);
  }
  return Result.ok(kept);
};

/** Que la columna ya tiene esa opción, y cuáles tiene si el agente puede saberlo. */
const sayOptionTaken = (column: McpColumn, taken: string, listNames: McpNameLister): string =>
  sayMcpRefusalWithNames(`${column.label} already has "${taken}".`, 'options', listMcpOptionNames(column), listNames);

const addOptionsTo = (
  column: McpColumn,
  values: readonly string[],
  listNames: McpNameLister,
): Result<McpColumn, string> => {
  const taken = values.find((value) => pickMcpOption(column, value, listNames).isOk());
  if (taken !== undefined) return Result.fail(sayOptionTaken(column, taken, listNames));
  const current = column.options ?? [];
  return Result.ok({ ...column, options: [...current, ...withColors(values, current.length)] });
};

const addOptions: McpColumnStep = (columns, changes, listNames) => {
  let changed = [...columns];
  for (const change of changes.addOptions ?? []) {
    const column = requireMcpColumn(changed, change.column, listNames);
    if (column.isFail()) return Result.fail(column.getError());
    const withOptions = addOptionsTo(column.getValue(), change.options, listNames);
    if (withOptions.isFail()) return Result.fail(withOptions.getError());
    changed = changed.map((candidate) =>
      candidate.key === withOptions.getValue().key ? withOptions.getValue() : candidate,
    );
  }
  return Result.ok(changed);
};

/** Si renombrar una opción a ese nombre la confundiría con otra que la columna ya tiene. */
const findCollidingOption = (column: McpColumn, from: string, to: string | null): string | null => {
  if (to === null) return null;
  const existing = pickMcpOption(column, to, hideMcpNames);
  return existing.isOk() && existing.getValue() !== from ? existing.getValue() : null;
};

const planRewrite = (
  known: McpColumnsInHand,
  reference: string,
  from: string,
  to: string | null,
): Result<McpOptionRewrite, string> => {
  const column = requireMcpColumn(known.columns, reference, known.listNames);
  if (column.isFail()) return Result.fail(column.getError());
  const option = pickMcpOption(column.getValue(), from, known.listNames);
  if (option.isFail()) return Result.fail(option.getError());
  const colliding = findCollidingOption(column.getValue(), option.getValue(), to);
  if (colliding !== null) return Result.fail(sayOptionTaken(column.getValue(), colliding, known.listNames));
  return Result.ok({ from: option.getValue(), propertyKey: column.getValue().key, to });
};

/** Una opción renombrada o quitada en la forma, tal como quedará después de reescribir sus filas. */
const rewriteOptionInShape = (columns: readonly McpColumn[], rewrite: McpOptionRewrite): McpColumn[] =>
  columns.map((column) => {
    if (column.key !== rewrite.propertyKey) return column;
    const options = column.options ?? [];
    if (rewrite.to === null) return { ...column, options: options.filter((option) => option.value !== rewrite.from) };
    const renamed = rewrite.to;
    return {
      ...column,
      options: options.map((option) => (option.value === rewrite.from ? { ...option, value: renamed } : option)),
    };
  });

/** Una opción que se reescribe en una columna que el mismo pedido quita: se pide una cosa o la otra. */
const findRewriteOfRemovedColumn = (
  rewrites: readonly McpOptionRewrite[],
  original: readonly McpColumn[],
  final: readonly McpColumn[],
): McpColumn | null => {
  const removed = rewrites.find((rewrite) => !final.some((column) => column.key === rewrite.propertyKey));
  return original.find((column) => column.key === removed?.propertyKey) ?? null;
};

const planOptionRewrites = (known: McpColumnsInHand, changes: McpColumnChanges): Result<McpOptionRewrite[], string> => {
  const planned = [
    ...(changes.renameOptions ?? []).map((change) => planRewrite(known, change.column, change.from, change.to)),
    ...(changes.removeOptions ?? []).map((change) => planRewrite(known, change.column, change.option, null)),
  ];
  const failed = planned.find((rewrite) => rewrite.isFail());
  return failed === undefined
    ? Result.ok(planned.map((rewrite) => rewrite.getValue()))
    : Result.fail(failed.getError());
};

/** Cada paso parte de las columnas que dejó el anterior, y el primero que falla corta la cadena. */
const applyColumnSteps = (
  columns: readonly McpColumn[],
  changes: McpColumnChanges,
  listNames: McpNameLister,
): Result<McpColumn[], string> =>
  [addColumns, renameColumns, removeColumns, addOptions].reduce<Result<McpColumn[], string>>(
    (current, step) => (current.isFail() ? current : step(current.getValue(), changes, listNames)),
    Result.ok([...columns]),
  );

const isAsked = (list: readonly unknown[] | undefined): boolean => list !== undefined && list.length > 0;

/** Si el agente pidió cambiar algo en las columnas. */
export const hasMcpColumnChanges = (changes: McpColumnChanges): boolean =>
  [
    changes.addColumns,
    changes.addOptions,
    changes.removeColumns,
    changes.removeOptions,
    changes.renameColumns,
    changes.renameOptions,
  ].some(isAsked);

/** Si algo de lo pedido cambia la forma guardada, y no solo reescribe opciones con sus filas. */
export const hasMcpShapeChanges = (changes: McpColumnChanges): boolean =>
  [changes.addColumns, changes.addOptions, changes.removeColumns, changes.renameColumns].some(isAsked);

/** Lo que el agente pidió, una línea por cambio, para dejarlo anotado. */
export const describeMcpColumnChanges = (changes: McpColumnChanges): { readonly changes: readonly string[] } => ({
  changes: [
    ...(changes.addColumns ?? []).map((column) => `add column ${column.name}`),
    ...(changes.renameColumns ?? []).map((change) => `rename column ${change.column} → ${change.name}`),
    ...(changes.removeColumns ?? []).map((column) => `remove column ${column}`),
    ...(changes.addOptions ?? []).map((change) => `add options ${change.column}: ${change.options.join(', ')}`),
    ...(changes.renameOptions ?? []).map((change) => `rename option ${change.column}: ${change.from} → ${change.to}`),
    ...(changes.removeOptions ?? []).map((change) => `remove option ${change.column}: ${change.option}`),
  ],
});

/**
 * Las columnas de una colección con lo que el agente pidió cambiar, ya en su
 * forma final.
 *
 * Cada columna y cada opción se nombra como la ve la gente. Una columna nueva
 * recibe la clave que le daría el portal, y una renombrada conserva la suya,
 * así las filas no pierden lo que tenían. Renombrar o quitar una opción vuelve
 * además aparte, porque también reescribe las filas que la tenían; la forma
 * que se devuelve ya la trae cambiada, así todo lo pedido se revisa junto
 * antes de que se reescriba la primera fila.
 */
export const applyMcpColumnChanges = (
  known: McpColumnsInHand,
  changes: McpColumnChanges,
): Result<McpColumnChangesPlan, string> => {
  const optionRewrites = planOptionRewrites(known, changes);
  if (optionRewrites.isFail()) return Result.fail(optionRewrites.getError());
  const rewritten = optionRewrites
    .getValue()
    .reduce((shape, rewrite) => rewriteOptionInShape(shape, rewrite), [...known.columns]);
  const properties = applyColumnSteps(rewritten, changes, known.listNames);
  if (properties.isFail()) return Result.fail(properties.getError());
  const removedWhileRewritten = findRewriteOfRemovedColumn(
    optionRewrites.getValue(),
    known.columns,
    properties.getValue(),
  );
  if (removedWhileRewritten !== null)
    return Result.fail(
      `${removedWhileRewritten.label} is removed in the same request that changes its options: ask for one or the other.`,
    );
  return Result.ok({ optionRewrites: optionRewrites.getValue(), properties: properties.getValue() });
};
