import { DatabasePropertyType } from '@company-brain/db';
import { buildPagePropertyKey, pickPageOptionColor, Result } from '@company-brain/shared';
import type {
  McpColumn,
  McpColumnChanges,
  McpColumnChangesPlan,
  McpOptionRewrite,
} from '../types/mcp.collections.types';
import { describeMcpOptions, pickMcpOption, requireMcpColumn } from './mcp.columns.lib';

const withColors = (values: readonly string[], firstIndex: number) =>
  values.map((value, at) => ({ color: pickPageOptionColor(firstIndex + at), value }));

const addColumns = (columns: readonly McpColumn[], changes: McpColumnChanges): Result<McpColumn[], string> => {
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

const renameColumns = (columns: readonly McpColumn[], changes: McpColumnChanges): Result<McpColumn[], string> => {
  let renamed = [...columns];
  for (const change of changes.renameColumns ?? []) {
    const column = requireMcpColumn(renamed, change.column);
    if (column.isFail()) return Result.fail(column.getError());
    const key = column.getValue().key;
    renamed = renamed.map((candidate) => (candidate.key === key ? { ...candidate, label: change.name } : candidate));
  }
  return Result.ok(renamed);
};

const removeColumns = (columns: readonly McpColumn[], changes: McpColumnChanges): Result<McpColumn[], string> => {
  let kept = [...columns];
  for (const reference of changes.removeColumns ?? []) {
    const column = requireMcpColumn(kept, reference);
    if (column.isFail()) return Result.fail(column.getError());
    if (column.getValue().type === DatabasePropertyType.TITLE)
      return Result.fail('The title column cannot be removed: every row needs a title.');
    kept = kept.filter((candidate) => candidate.key !== column.getValue().key);
  }
  return Result.ok(kept);
};

const addOptionsTo = (column: McpColumn, values: readonly string[]): Result<McpColumn, string> => {
  const taken = values.find((value) => pickMcpOption(column, value).isOk());
  if (taken !== undefined) return Result.fail(`${column.label} already has "${taken}": ${describeMcpOptions(column)}.`);
  const current = column.options ?? [];
  return Result.ok({ ...column, options: [...current, ...withColors(values, current.length)] });
};

const addOptions = (columns: readonly McpColumn[], changes: McpColumnChanges): Result<McpColumn[], string> => {
  let changed = [...columns];
  for (const change of changes.addOptions ?? []) {
    const column = requireMcpColumn(changed, change.column);
    if (column.isFail()) return Result.fail(column.getError());
    const withOptions = addOptionsTo(column.getValue(), change.options);
    if (withOptions.isFail()) return Result.fail(withOptions.getError());
    changed = changed.map((candidate) =>
      candidate.key === withOptions.getValue().key ? withOptions.getValue() : candidate,
    );
  }
  return Result.ok(changed);
};

const planRewrite = (
  columns: readonly McpColumn[],
  reference: string,
  from: string,
  to: string | null,
): Result<McpOptionRewrite, string> => {
  const column = requireMcpColumn(columns, reference);
  if (column.isFail()) return Result.fail(column.getError());
  const option = pickMcpOption(column.getValue(), from);
  if (option.isFail()) return Result.fail(option.getError());
  return Result.ok({ from: option.getValue(), propertyKey: column.getValue().key, to });
};

const planOptionRewrites = (
  columns: readonly McpColumn[],
  changes: McpColumnChanges,
): Result<McpOptionRewrite[], string> => {
  const planned = [
    ...(changes.renameOptions ?? []).map((change) => planRewrite(columns, change.column, change.from, change.to)),
    ...(changes.removeOptions ?? []).map((change) => planRewrite(columns, change.column, change.option, null)),
  ];
  const failed = planned.find((rewrite) => rewrite.isFail());
  return failed === undefined
    ? Result.ok(planned.map((rewrite) => rewrite.getValue()))
    : Result.fail(failed.getError());
};

/** Cada paso parte de las columnas que dejó el anterior, y el primero que falla corta la cadena. */
const applyColumnSteps = (columns: readonly McpColumn[], changes: McpColumnChanges): Result<McpColumn[], string> =>
  [addColumns, renameColumns, removeColumns, addOptions].reduce<Result<McpColumn[], string>>(
    (current, step) => (current.isFail() ? current : step(current.getValue(), changes)),
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

/** Lo pedido sin renombrar ni quitar opciones: lo que queda después de reescribirlas. */
export const withoutMcpOptionRewrites = (changes: McpColumnChanges): McpColumnChanges => {
  const { removeOptions: _removeOptions, renameOptions: _renameOptions, ...rest } = changes;
  return rest;
};

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
 * Las columnas de una colección con lo que el agente pidió cambiar.
 *
 * Cada columna y cada opción se nombra como la ve la gente. Una columna nueva
 * recibe la clave que le daría el portal, y una renombrada conserva la suya,
 * así las filas no pierden lo que tenían. Renombrar o quitar una opción no
 * cambia la forma aquí: vuelve aparte, porque además reescribe las filas que
 * la tenían.
 */
export const applyMcpColumnChanges = (
  columns: readonly McpColumn[],
  changes: McpColumnChanges,
): Result<McpColumnChangesPlan, string> => {
  const optionRewrites = planOptionRewrites(columns, changes);
  if (optionRewrites.isFail()) return Result.fail(optionRewrites.getError());
  const properties = applyColumnSteps(columns, changes);
  if (properties.isFail()) return Result.fail(properties.getError());
  return Result.ok({ optionRewrites: optionRewrites.getValue(), properties: properties.getValue() });
};
