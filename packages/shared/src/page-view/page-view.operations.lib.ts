import { Result } from '../result.js';
import {
  EMPTY_PAGE_VIEW_CONFIGURATION,
  pageViewConfigurationSchema,
  rootFilterSchema,
  sortSchema,
} from './page-view.schemas.js';
import type {
  PageFilterNodePatch,
  PageViewListKey,
  PageViewMapKey,
  PageViewOperation,
  PageViewOperationContext,
  PageViewOperationError,
  PageViewScalarKey,
  PageViewState,
} from './page-view.operations.types.js';
import { PAGE_VIEW_MANUAL_ORDER_MAXIMUM } from './page-view.operations.types.js';
import type { PageFilter, PageFilterCondition, PageFilterGroup } from './page-view.types.js';
import { PAGE_FILTER_GROUP_OPERATOR, PAGE_FILTER_OPERATOR_VALUES } from './page-view.types.js';

type Outcome = Result<PageViewState, PageViewOperationError>;

const invalid = (message: string): Outcome => Result.fail({ code: 'INVALID', message });

const notFound = (message: string): Outcome => Result.fail({ code: 'NOT_FOUND', message });

/** Moving an id removes it first, then puts it after (or before) the anchor; a missing anchor means an end. */
const placeRelative = (
  list: readonly string[],
  id: string,
  anchor: string | undefined,
  side: 'after' | 'before',
): readonly string[] => {
  const without = list.filter((entry) => entry !== id);
  const position = anchor === undefined ? -1 : without.indexOf(anchor);
  if (position === -1) return side === 'after' ? [...without, id] : [id, ...without];
  const insertAt = side === 'after' ? position + 1 : position;
  return [...without.slice(0, insertAt), id, ...without.slice(insertAt)];
};

const readList = (
  state: PageViewState,
  list: PageViewListKey,
  context: PageViewOperationContext,
): readonly string[] => {
  switch (list) {
    case 'manualOrder':
      return state.manualOrder ?? context.collectionOrder;
    case 'visibleProperties':
      return state.configuration.visibleProperties ?? context.propertyKeys;
    case 'collapsedGroups':
      return state.configuration.collapsedGroups;
    case 'hiddenGroups':
      return state.configuration.hiddenGroups;
  }
};

const withList = (state: PageViewState, list: PageViewListKey, next: readonly string[]): Outcome => {
  if (list === 'manualOrder') {
    if (next.length > PAGE_VIEW_MANUAL_ORDER_MAXIMUM) {
      return Result.fail({
        code: 'MANUAL_ORDER_TOO_LONG',
        message: 'The view cannot be ordered by hand past 20,000 rows',
      });
    }
    return Result.ok({ ...state, manualOrder: next });
  }
  const checked = pageViewConfigurationSchema.shape[list].safeParse(next);
  if (!checked.success) return invalid(`The list ${list} does not take that value`);
  return Result.ok({ ...state, configuration: { ...state.configuration, [list]: next } });
};

const applyList = (
  state: PageViewState,
  operation: Extract<PageViewOperation, { command: 'listAfter' | 'listBefore' | 'listRemove' }>,
  context: PageViewOperationContext,
): Outcome => {
  const current = readList(state, operation.list, context);
  switch (operation.command) {
    case 'listAfter':
      return withList(state, operation.list, placeRelative(current, operation.id, operation.after, 'after'));
    case 'listBefore':
      return withList(state, operation.list, placeRelative(current, operation.id, operation.before, 'before'));
    case 'listRemove':
      return withList(
        state,
        operation.list,
        current.filter((entry) => entry !== operation.id),
      );
  }
};

const applySet = (state: PageViewState, key: PageViewScalarKey, value: unknown): Outcome => {
  const field = pageViewConfigurationSchema.shape[key];
  const checked = field.safeParse(value);
  if (!checked.success) return invalid(`The key ${key} does not take that value`);
  // A cleared key goes back to what an absent key means, so the stored configuration stays readable.
  const next = value === null || value === undefined ? EMPTY_PAGE_VIEW_CONFIGURATION[key] : checked.data;
  return Result.ok({ ...state, configuration: { ...state.configuration, [key]: next } });
};

const applyMapEntry = (
  state: PageViewState,
  map: PageViewMapKey,
  key: string,
  value: unknown,
  isRemoval: boolean,
): Outcome => {
  const current: Readonly<Record<string, unknown>> = state.configuration[map];
  const entries = Object.entries(current).filter(([entryKey]) => entryKey !== key);
  const next = Object.fromEntries(isRemoval ? entries : [...entries, [key, value]]);
  const checked = pageViewConfigurationSchema.shape[map].safeParse(next);
  if (!checked.success) return invalid(`The entry ${key} of ${map} does not take that value`);
  return Result.ok({ ...state, configuration: { ...state.configuration, [map]: checked.data } });
};

const applySortSet = (state: PageViewState, operation: Extract<PageViewOperation, { command: 'sortSet' }>): Outcome => {
  const sort = { direction: operation.direction, propertyKey: operation.propertyKey };
  const checked = sortSchema.safeParse(sort);
  if (!checked.success) return invalid('The sort does not fit');
  const sorts = state.configuration.sorts;
  const isPresent = sorts.some((existing) => existing.propertyKey === operation.propertyKey);
  const anchoredAt = sorts.findIndex((existing) => existing.propertyKey === operation.after);
  const anchorPosition = anchoredAt === -1 ? sorts.length - 1 : anchoredAt;
  const next = isPresent
    ? sorts.map((existing) => (existing.propertyKey === operation.propertyKey ? checked.data : existing))
    : [...sorts.slice(0, anchorPosition + 1), checked.data, ...sorts.slice(anchorPosition + 1)];
  const maxChecked = pageViewConfigurationSchema.shape.sorts.safeParse(next);
  if (!maxChecked.success) return invalid('A view takes at most five sorts');
  return Result.ok({ ...state, configuration: { ...state.configuration, sorts: next } });
};

const assignFilterIds = (node: PageFilter, createId: () => string): PageFilter => {
  const id = node.id ?? createId();
  if (node.kind === 'CONDITION') return { ...node, id };
  return { ...node, conditions: node.conditions.map((child) => assignFilterIds(child, createId)), id };
};

const emptyRootGroup = (createId: () => string): PageFilterGroup => ({
  conditions: [],
  id: createId(),
  kind: 'GROUP',
  operator: PAGE_FILTER_GROUP_OPERATOR.AND,
});

const toRootGroup = (filter: PageFilter | null, createId: () => string): PageFilterGroup => {
  if (filter === null) return emptyRootGroup(createId);
  if (filter.kind === 'GROUP') return filter;
  return { ...emptyRootGroup(createId), conditions: [filter] };
};

const insertInto = (
  node: PageFilter,
  parentId: string,
  inserted: PageFilter,
  after: string | undefined,
): PageFilter | null => {
  if (node.kind === 'CONDITION') return null;
  if (node.id === parentId) {
    const position = after === undefined ? -1 : node.conditions.findIndex((child) => child.id === after);
    const at = position === -1 ? node.conditions.length : position + 1;
    return { ...node, conditions: [...node.conditions.slice(0, at), inserted, ...node.conditions.slice(at)] };
  }
  for (const [index, child] of node.conditions.entries()) {
    const replaced = insertInto(child, parentId, inserted, after);
    if (replaced !== null) {
      return {
        ...node,
        conditions: node.conditions.map((existing, position) => (position === index ? replaced : existing)),
      };
    }
  }
  return null;
};

const withFilter = (state: PageViewState, filter: PageFilter | null): Outcome => {
  if (filter !== null) {
    const checked = rootFilterSchema.safeParse(filter);
    if (!checked.success) return invalid('The filter does not fit or is nested too deeply');
  }
  return Result.ok({ ...state, configuration: { ...state.configuration, filter } });
};

const applyFilterInsert = (
  state: PageViewState,
  operation: Extract<PageViewOperation, { command: 'filterInsert' }>,
  context: PageViewOperationContext,
): Outcome => {
  const inserted = assignFilterIds(operation.node, context.createId);
  // A view with no filter takes the inserted node as its filter, so a whole filter can arrive in one operation.
  if (state.configuration.filter === null) {
    return withFilter(
      state,
      inserted.kind === 'GROUP' ? inserted : { ...emptyRootGroup(context.createId), conditions: [inserted] },
    );
  }
  const root = toRootGroup(state.configuration.filter, context.createId);
  const parentId = operation.parentId ?? root.id;
  if (parentId === undefined) return invalid('The root of the filter has no id');
  const next = insertInto(root, parentId, inserted, operation.after);
  return next === null ? notFound('The group to insert into is not in the filter') : withFilter(state, next);
};

const patchCondition = (node: PageFilterCondition, patch: PageFilterNodePatch): PageFilterCondition | null => {
  const requested = patch.operator ?? node.operator;
  const operator = PAGE_FILTER_OPERATOR_VALUES.find((known) => known === requested);
  if (operator === undefined) return null;
  const value = patch.value === undefined ? node.value : patch.value;
  return { ...node, operator, propertyKey: patch.propertyKey ?? node.propertyKey, value };
};

const patchNode = (node: PageFilter, patch: PageFilterNodePatch): PageFilter | null => {
  if (node.kind === 'CONDITION') return patchCondition(node, patch);
  return patch.groupOperator === undefined ? node : { ...node, operator: patch.groupOperator };
};

const updateNode = (node: PageFilter, id: string, patch: PageFilterNodePatch): PageFilter | null | undefined => {
  if (node.id === id) return patchNode(node, patch);
  if (node.kind === 'CONDITION') return undefined;
  for (const [index, child] of node.conditions.entries()) {
    const updated = updateNode(child, id, patch);
    if (updated === undefined) continue;
    if (updated === null) return null;
    return {
      ...node,
      conditions: node.conditions.map((existing, position) => (position === index ? updated : existing)),
    };
  }
  return undefined;
};

const removeNode = (node: PageFilter, id: string): PageFilter | undefined => {
  if (node.kind === 'CONDITION') return undefined;
  if (node.conditions.some((child) => child.id === id)) {
    return { ...node, conditions: node.conditions.filter((child) => child.id !== id) };
  }
  for (const [index, child] of node.conditions.entries()) {
    const removed = removeNode(child, id);
    if (removed === undefined) continue;
    return {
      ...node,
      conditions: node.conditions.map((existing, position) => (position === index ? removed : existing)),
    };
  }
  return undefined;
};

const applyFilterUpdate = (
  state: PageViewState,
  operation: Extract<PageViewOperation, { command: 'filterUpdate' }>,
): Outcome => {
  const root = state.configuration.filter;
  if (root === null) return notFound('The view has no filter');
  const updated = updateNode(root, operation.id, operation.patch);
  if (updated === undefined) return notFound('The filter node is not in the view');
  return updated === null ? invalid('The filter node does not take that change') : withFilter(state, updated);
};

const applyFilterRemove = (state: PageViewState, id: string): Outcome => {
  const root = state.configuration.filter;
  if (root === null) return notFound('The view has no filter');
  if (root.id === id) return withFilter(state, null);
  const removed = removeNode(root, id);
  return removed === undefined ? notFound('The filter node is not in the view') : withFilter(state, removed);
};

/**
 * One operation on the state of a view. Pure: the caller holds the lock that makes read-apply-write safe, so two
 * people who change different keys or different elements never undo each other.
 */
export const applyPageViewOperation = (
  state: PageViewState,
  operation: PageViewOperation,
  context: PageViewOperationContext,
): Outcome => {
  switch (operation.command) {
    case 'set':
      return applySet(state, operation.key, operation.value);
    case 'setEntry':
      return applyMapEntry(state, operation.map, operation.key, operation.value, false);
    case 'removeEntry':
      return applyMapEntry(state, operation.map, operation.key, undefined, true);
    case 'listAfter':
    case 'listBefore':
    case 'listRemove':
      return applyList(state, operation, context);
    case 'sortSet':
      return applySortSet(state, operation);
    case 'sortRemove':
      return Result.ok({
        ...state,
        configuration: {
          ...state.configuration,
          sorts: state.configuration.sorts.filter((sort) => sort.propertyKey !== operation.propertyKey),
        },
      });
    case 'filterInsert':
      return applyFilterInsert(state, operation, context);
    case 'filterUpdate':
      return applyFilterUpdate(state, operation);
    case 'filterRemove':
      return applyFilterRemove(state, operation.id);
  }
};
