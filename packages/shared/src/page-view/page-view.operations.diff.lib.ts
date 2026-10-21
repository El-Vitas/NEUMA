import type { PageFilterNodePatch, PageViewMapKey, PageViewOperation } from './page-view.operations.types.js';
import { PAGE_VIEW_MAP_KEYS, PAGE_VIEW_SCALAR_KEYS } from './page-view.operations.types.js';
import type { PageFilter, PageFilterCondition, PageSort, PageViewConfiguration } from './page-view.types.js';

/**
 * What changed between two configurations, as the operations that make it so. The portal edits a whole
 * configuration on screen but writes only these, so a change to one key never carries the old value of another.
 */

const isSame = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

const diffScalars = (before: PageViewConfiguration, after: PageViewConfiguration): PageViewOperation[] =>
  PAGE_VIEW_SCALAR_KEYS.filter((key) => !isSame(before[key], after[key])).map((key) => ({
    command: 'set' as const,
    key,
    value: after[key],
  }));

const diffMap = (
  map: PageViewMapKey,
  before: PageViewConfiguration,
  after: PageViewConfiguration,
): PageViewOperation[] => {
  const previous: Readonly<Record<string, unknown>> = before[map];
  const next: Readonly<Record<string, unknown>> = after[map];
  const changed = Object.entries(next)
    .filter(([key, value]) => !isSame(previous[key], value))
    .map(([key, value]): PageViewOperation => ({ command: 'setEntry', key, map, value }));
  const removed = Object.keys(previous)
    .filter((key) => !(key in next))
    .map((key): PageViewOperation => ({ command: 'removeEntry', key, map }));
  return [...changed, ...removed];
};

type ListKey = 'collapsedGroups' | 'hiddenGroups' | 'visibleProperties';

/** Removals first, then each item that is not where it should be goes after its predecessor in the new list. */
const diffList = (list: ListKey, before: readonly string[], after: readonly string[]): PageViewOperation[] => {
  const operations: PageViewOperation[] = [];
  const kept = new Set(after);
  let simulated = before.filter((id) => kept.has(id));
  for (const id of before.filter((entry) => !kept.has(entry))) {
    operations.push({ command: 'listRemove', id, list });
  }
  for (const [position, id] of after.entries()) {
    if (simulated[position] === id) continue;
    const predecessor = position === 0 ? undefined : after[position - 1];
    operations.push(
      predecessor === undefined
        ? { before: simulated[0], command: 'listBefore', id, list }
        : { after: predecessor, command: 'listAfter', id, list },
    );
    const without = simulated.filter((entry) => entry !== id);
    const insertAt = predecessor === undefined ? 0 : without.indexOf(predecessor) + 1;
    simulated = [...without.slice(0, insertAt), id, ...without.slice(insertAt)];
  }
  return operations;
};

const diffLists = (before: PageViewConfiguration, after: PageViewConfiguration): PageViewOperation[] => [
  ...diffList('collapsedGroups', before.collapsedGroups, after.collapsedGroups),
  ...diffList('hiddenGroups', before.hiddenGroups, after.hiddenGroups),
  ...(before.visibleProperties !== null && after.visibleProperties !== null
    ? diffList('visibleProperties', before.visibleProperties, after.visibleProperties)
    : []),
];

const countSharedPrefix = (before: readonly PageSort[], after: readonly PageSort[]): number => {
  let shared = 0;
  while (
    shared < before.length &&
    shared < after.length &&
    before[shared]?.propertyKey === after[shared]?.propertyKey
  ) {
    shared += 1;
  }
  return shared;
};

const diffSorts = (before: readonly PageSort[], after: readonly PageSort[]): PageViewOperation[] => {
  const shared = countSharedPrefix(before, after);
  const flipped = after
    .slice(0, shared)
    .flatMap((sort, index): PageViewOperation[] =>
      before[index]?.direction === sort.direction
        ? []
        : [{ command: 'sortSet', direction: sort.direction, propertyKey: sort.propertyKey }],
    );
  const removed = before
    .slice(shared)
    .map((sort): PageViewOperation => ({ command: 'sortRemove', propertyKey: sort.propertyKey }));
  const added = after.slice(shared).map(
    (sort, index): PageViewOperation => ({
      after: after[shared + index - 1]?.propertyKey,
      command: 'sortSet',
      direction: sort.direction,
      propertyKey: sort.propertyKey,
    }),
  );
  return [...flipped, ...removed, ...added];
};

interface FilterDiff {
  readonly inserts: PageViewOperation[];
  readonly removes: PageViewOperation[];
  readonly updates: PageViewOperation[];
}

const patchOf = (before: PageFilterCondition, after: PageFilterCondition): PageFilterNodePatch | null => {
  const patch: { operator?: string; propertyKey?: string; value?: PageFilterCondition['value'] } = {};
  if (before.operator !== after.operator) patch.operator = after.operator;
  if (before.propertyKey !== after.propertyKey) patch.propertyKey = after.propertyKey;
  if (!isSame(before.value, after.value)) patch.value = after.value;
  return Object.keys(patch).length === 0 ? null : patch;
};

const diffGroupChildren = (
  before: PageFilter & { kind: 'GROUP' },
  after: PageFilter & { kind: 'GROUP' },
  found: FilterDiff,
): void => {
  const beforeIds = new Set(before.conditions.flatMap((child) => (child.id === undefined ? [] : [child.id])));
  const afterIds = new Set(after.conditions.flatMap((child) => (child.id === undefined ? [] : [child.id])));
  for (const child of before.conditions) {
    if (child.id !== undefined && !afterIds.has(child.id))
      found.removes.push({ command: 'filterRemove', id: child.id });
  }
  for (const [position, child] of after.conditions.entries()) {
    const previous =
      child.id === undefined ? undefined : before.conditions.find((candidate) => candidate.id === child.id);
    if (previous !== undefined) {
      diffNode(previous, child, found);
      continue;
    }
    const isKnown = child.id !== undefined && beforeIds.has(child.id);
    if (isKnown) continue;
    found.inserts.push({
      after: after.conditions[position - 1]?.id,
      command: 'filterInsert',
      node: child,
      parentId: after.id,
    });
  }
};

const diffNode = (before: PageFilter, after: PageFilter, found: FilterDiff): void => {
  if (before.id === undefined || before.id !== after.id) return;
  if (before.kind === 'CONDITION' && after.kind === 'CONDITION') {
    const patch = patchOf(before, after);
    if (patch !== null) found.updates.push({ command: 'filterUpdate', id: before.id, patch });
    return;
  }
  if (before.kind === 'GROUP' && after.kind === 'GROUP') {
    if (before.operator !== after.operator) {
      found.updates.push({ command: 'filterUpdate', id: before.id, patch: { groupOperator: after.operator } });
    }
    diffGroupChildren(before, after, found);
  }
};

const diffFilter = (before: PageFilter | null, after: PageFilter | null): PageViewOperation[] => {
  if (isSame(before, after)) return [];
  if (after === null) return before?.id === undefined ? [] : [{ command: 'filterRemove', id: before.id }];
  if (before === null) return [{ command: 'filterInsert', node: after }];
  if (before.id === undefined || before.id !== after.id || before.kind !== after.kind) {
    return before.id === undefined
      ? [{ command: 'filterInsert', node: after }]
      : [
          { command: 'filterRemove', id: before.id },
          { command: 'filterInsert', node: after },
        ];
  }
  const found: FilterDiff = { inserts: [], removes: [], updates: [] };
  diffNode(before, after, found);
  return [...found.removes, ...found.updates, ...found.inserts];
};

export const diffPageViewConfigurations = (
  before: PageViewConfiguration,
  after: PageViewConfiguration,
): PageViewOperation[] => [
  ...diffScalars(before, after),
  ...PAGE_VIEW_MAP_KEYS.flatMap((map) => diffMap(map, before, after)),
  ...diffLists(before, after),
  ...diffSorts(before.sorts, after.sorts),
  ...diffFilter(before.filter, after.filter),
];
