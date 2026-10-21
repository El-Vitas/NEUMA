import { DatabasePropertyType } from '@neuma/db';
import {
  buildPagePropertyKey,
  DEFAULT_PAGE_PROPERTY_CONFIG,
  PAGE_NUMBER_FORMAT,
  PAGE_STATUS_GROUP,
  pagePropertyRequiresOptions,
  pickPageOptionColor,
  Result,
} from '@neuma/shared';
import type {
  McpColumnChanges,
  McpColumnChangesPlan,
  McpColumnDraft,
  McpColumnStep,
  McpColumnsInHand,
  McpNameLister,
  McpNewColumn,
  McpOptionRewrite,
} from '../types/mcp.collections.types';
import {
  findMcpOption,
  hideMcpNames,
  listMcpOptionNames,
  requireMcpColumn,
  sayMcpRefusalWithNames,
} from './mcp.columns.lib';

/** Options added by a request have no id: the server gives them one when the collection is saved. */
const withColors = (values: readonly string[], firstIndex: number) =>
  values.map((value, at) => ({ color: pickPageOptionColor(firstIndex + at), group: null, id: null, value }));

const toNewColumnConfig = (column: McpNewColumn) => ({
  ...DEFAULT_PAGE_PROPERTY_CONFIG,
  allowsMultiple: column.multiple ?? false,
  currency: column.currency ?? null,
  decimals: column.decimals ?? null,
  numberFormat: column.numberFormat ?? PAGE_NUMBER_FORMAT.NUMBER,
  prefix: column.prefix ?? '',
  targetCollectionId: column.target ?? null,
});

/** A status brings its own options, one in each group, so the ones an agent names are not read for it. */
const toNewColumnOptions = (column: McpNewColumn) => {
  if (column.type === DatabasePropertyType.STATUS || !pagePropertyRequiresOptions(column.type)) {
    return column.options !== undefined && column.type !== DatabasePropertyType.STATUS
      ? withColors(column.options, 0)
      : null;
  }
  return withColors(column.options ?? [], 0);
};

const addColumns: McpColumnStep = (columns, changes) => {
  const added = [...columns];
  for (const column of changes.addColumns ?? []) {
    if (column.type === DatabasePropertyType.RELATION && column.target === undefined) {
      return Result.fail(`${column.name} is a relation: say which collection it links with target.`);
    }
    added.push({
      config: toNewColumnConfig(column),
      key: buildPagePropertyKey(column.name, added),
      label: column.name,
      options: toNewColumnOptions(column),
      required: false,
      ...(column.type === DatabasePropertyType.RELATION ? { twoWay: column.twoWay === true } : {}),
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

const sayOptionTaken = (column: McpColumnDraft, taken: string, listNames: McpNameLister): string =>
  sayMcpRefusalWithNames(`${column.label} already has "${taken}".`, 'options', listMcpOptionNames(column), listNames);

/** An option an agent adds to a status goes to the group of what has not begun, like the portal's first option. */
const withGroupFor = (column: McpColumnDraft, values: readonly string[], firstIndex: number) =>
  withColors(values, firstIndex).map((option) =>
    column.type === DatabasePropertyType.STATUS ? { ...option, group: PAGE_STATUS_GROUP.TO_DO } : option,
  );

const addOptionsTo = (
  column: McpColumnDraft,
  values: readonly string[],
  listNames: McpNameLister,
): Result<McpColumnDraft, string> => {
  const taken = values.find((value) => findMcpOption(column, value, listNames).isOk());
  if (taken !== undefined) return Result.fail(sayOptionTaken(column, taken, listNames));
  const current = column.options ?? [];
  return Result.ok({ ...column, options: [...current, ...withGroupFor(column, values, current.length)] });
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

/** The name another option already answers to, when the new name is taken by an option other than this one. */
const findCollidingOption = (column: McpColumnDraft, optionId: string | null, to: string | null): string | null => {
  if (to === null) return null;
  const existing = findMcpOption(column, to, hideMcpNames);
  return existing.isOk() && existing.getValue().id !== optionId ? existing.getValue().value : null;
};

const planRewrite = (
  known: McpColumnsInHand,
  reference: string,
  from: string,
  to: string | null,
): Result<McpOptionRewrite, string> => {
  const column = requireMcpColumn(known.columns, reference, known.listNames);
  if (column.isFail()) return Result.fail(column.getError());
  const option = findMcpOption(column.getValue(), from, known.listNames);
  if (option.isFail()) return Result.fail(option.getError());
  const { id, value } = option.getValue();
  if (id === null)
    return Result.fail(`${column.getValue().label}: "${from}" was just added. Save the collection first.`);
  const colliding = findCollidingOption(column.getValue(), id, to);
  if (colliding !== null) return Result.fail(sayOptionTaken(column.getValue(), colliding, known.listNames));
  return Result.ok({ from: value, optionId: id, propertyKey: column.getValue().key, to });
};

const rewriteOptionInShape = (columns: readonly McpColumnDraft[], rewrite: McpOptionRewrite): McpColumnDraft[] =>
  columns.map((column) => {
    if (column.key !== rewrite.propertyKey) return column;
    const options = column.options ?? [];
    if (rewrite.to === null) return { ...column, options: options.filter((option) => option.id !== rewrite.optionId) };
    const renamed = rewrite.to;
    return {
      ...column,
      options: options.map((option) => (option.id === rewrite.optionId ? { ...option, value: renamed } : option)),
    };
  });

const findRewriteOfRemovedColumn = (
  rewrites: readonly McpOptionRewrite[],
  original: readonly McpColumnDraft[],
  final: readonly McpColumnDraft[],
): McpColumnDraft | null => {
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

/** Each step starts from the columns the previous one left; the first failure stops the chain. */
const applyColumnSteps = (
  columns: readonly McpColumnDraft[],
  changes: McpColumnChanges,
  listNames: McpNameLister,
): Result<McpColumnDraft[], string> =>
  [addColumns, renameColumns, removeColumns, addOptions].reduce<Result<McpColumnDraft[], string>>(
    (current, step) => (current.isFail() ? current : step(current.getValue(), changes, listNames)),
    Result.ok([...columns]),
  );

const isAsked = (list: readonly unknown[] | undefined): boolean => list !== undefined && list.length > 0;

export const hasMcpColumnChanges = (changes: McpColumnChanges): boolean =>
  [
    changes.addColumns,
    changes.addOptions,
    changes.removeColumns,
    changes.removeOptions,
    changes.renameColumns,
    changes.renameOptions,
  ].some(isAsked);

/** False when the request only rewrites options along with their rows. */
export const hasMcpShapeChanges = (changes: McpColumnChanges): boolean =>
  [changes.addColumns, changes.addOptions, changes.removeColumns, changes.renameColumns].some(isAsked);

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
 * A new column gets the key the portal would give it; a renamed one keeps its key so rows keep
 * their values. Renaming or removing an option is also returned separately because it rewrites
 * rows; the returned shape already includes it, so the whole request is validated before the first row is rewritten.
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
