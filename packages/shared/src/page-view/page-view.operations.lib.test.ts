import { describe, expect, test } from 'bun:test';
import { applyPageViewOperation } from './page-view.operations.lib.js';
import type { PageViewOperationContext, PageViewState } from './page-view.operations.types.js';
import { EMPTY_PAGE_VIEW_CONFIGURATION } from './page-view.schemas.js';

let nextId = 0;
const context: PageViewOperationContext = {
  collectionOrder: ['r1', 'r2', 'r3'],
  createId: () => {
    nextId += 1;
    return `node${String(nextId)}`;
  },
  propertyKeys: ['status', 'owner', 'due'],
};

const startState: PageViewState = { configuration: EMPTY_PAGE_VIEW_CONFIGURATION, manualOrder: null };

const apply = (state: PageViewState, operation: Parameters<typeof applyPageViewOperation>[1]): PageViewState => {
  const result = applyPageViewOperation(state, operation, context);
  if (result.isFail()) throw new Error(result.getError().message);
  return result.getValue();
};

describe('set', () => {
  test('replaces one scalar key and leaves the rest alone', () => {
    const state = apply(
      { ...startState, configuration: { ...startState.configuration, frozenColumns: 2 } },
      {
        command: 'set',
        key: 'groupBy',
        value: 'status',
      },
    );

    expect(state.configuration.groupBy).toBe('status');
    expect(state.configuration.frozenColumns).toBe(2);
  });

  test('refuses a value the key does not take', () => {
    const result = applyPageViewOperation(startState, { command: 'set', key: 'frozenColumns', value: 'many' }, context);

    expect(result.isFail()).toBe(true);
  });
});

describe('setEntry and removeEntry', () => {
  test('changes the entry of one key and keeps the others', () => {
    const first = apply(startState, { command: 'setEntry', key: 'status', map: 'columnWidths', value: 200 });
    const second = apply(first, { command: 'setEntry', key: 'owner', map: 'columnWidths', value: 150 });
    const third = apply(second, { command: 'removeEntry', key: 'status', map: 'columnWidths' });

    expect(second.configuration.columnWidths).toEqual({ owner: 150, status: 200 });
    expect(third.configuration.columnWidths).toEqual({ owner: 150 });
  });

  test('refuses a width outside the allowed range', () => {
    const result = applyPageViewOperation(
      startState,
      { command: 'setEntry', key: 'status', map: 'columnWidths', value: 10 },
      context,
    );

    expect(result.isFail()).toBe(true);
  });
});

describe('lists', () => {
  test('visibleProperties starts from every property the first time it is touched', () => {
    const state = apply(startState, { command: 'listRemove', id: 'owner', list: 'visibleProperties' });

    expect(state.configuration.visibleProperties).toEqual(['status', 'due']);
  });

  test('listAfter inserts after the anchor and moves an id that was already there', () => {
    const start = { ...startState, configuration: { ...startState.configuration, hiddenGroups: ['a', 'b', 'c'] } };

    const state = apply(start, { after: 'b', command: 'listAfter', id: 'a', list: 'hiddenGroups' });

    expect(state.configuration.hiddenGroups).toEqual(['b', 'a', 'c']);
  });

  test('listAfter puts the id at the end when the anchor is gone', () => {
    const start = { ...startState, configuration: { ...startState.configuration, hiddenGroups: ['a', 'b'] } };

    const state = apply(start, { after: 'gone', command: 'listAfter', id: 'a', list: 'hiddenGroups' });

    expect(state.configuration.hiddenGroups).toEqual(['b', 'a']);
  });

  test('listBefore without an anchor puts the id first', () => {
    const start = { ...startState, configuration: { ...startState.configuration, hiddenGroups: ['a', 'b'] } };

    const state = apply(start, { command: 'listBefore', id: 'b', list: 'hiddenGroups' });

    expect(state.configuration.hiddenGroups).toEqual(['b', 'a']);
  });
});

describe('manual order', () => {
  test('starts from the order of the collection the first time a row is placed', () => {
    const state = apply(startState, { after: 'r1', command: 'listAfter', id: 'r3', list: 'manualOrder' });

    expect(state.manualOrder).toEqual(['r1', 'r3', 'r2']);
  });

  test('two moves with different anchors do not undo each other', () => {
    const base = { ...startState, manualOrder: ['r1', 'r2', 'r3', 'r4'] };

    const mineFirst = apply(apply(base, { before: 'r1', command: 'listBefore', id: 'r4', list: 'manualOrder' }), {
      after: 'r2',
      command: 'listAfter',
      id: 'r1',
      list: 'manualOrder',
    });
    const theirsFirst = apply(apply(base, { after: 'r2', command: 'listAfter', id: 'r1', list: 'manualOrder' }), {
      before: 'r1',
      command: 'listBefore',
      id: 'r4',
      list: 'manualOrder',
    });

    expect(mineFirst.manualOrder).toEqual(['r4', 'r2', 'r1', 'r3']);
    expect(theirsFirst.manualOrder).toEqual(['r2', 'r4', 'r1', 'r3']);
  });

  test('refuses a list longer than the limit', () => {
    const long = Array.from({ length: 20_000 }, (_, index) => `r${String(index)}`);

    const result = applyPageViewOperation(
      { ...startState, manualOrder: long },
      { command: 'listAfter', id: 'extra', list: 'manualOrder' },
      context,
    );

    expect(result.isFail()).toBe(true);
  });
});

describe('sorts', () => {
  test('sortSet adds a sort, changes its direction and keeps its place', () => {
    const first = apply(startState, { command: 'sortSet', direction: 'ASCENDING', propertyKey: 'status' });
    const second = apply(first, { command: 'sortSet', direction: 'ASCENDING', propertyKey: 'due' });
    const third = apply(second, { command: 'sortSet', direction: 'DESCENDING', propertyKey: 'status' });

    expect(third.configuration.sorts).toEqual([
      { direction: 'DESCENDING', propertyKey: 'status' },
      { direction: 'ASCENDING', propertyKey: 'due' },
    ]);
  });

  test('sortRemove drops one sort', () => {
    const first = apply(startState, { command: 'sortSet', direction: 'ASCENDING', propertyKey: 'status' });

    expect(apply(first, { command: 'sortRemove', propertyKey: 'status' }).configuration.sorts).toEqual([]);
  });
});

describe('filter nodes', () => {
  const condition = { kind: 'CONDITION', operator: 'IS', propertyKey: 'status', value: 'open' } as const;

  test('filterInsert at the root creates the root group and gives every node an id', () => {
    const state = apply(startState, { command: 'filterInsert', node: condition });

    const filter = state.configuration.filter;
    if (filter?.kind !== 'GROUP') throw new Error('no filter group');
    expect(filter.id).toBeTypeOf('string');
    expect(filter.operator).toBe('AND');
    expect(filter.conditions).toHaveLength(1);
    expect(firstConditionId(state)).toBeTypeOf('string');
  });

  test('filterUpdate changes one condition and leaves its sibling alone', () => {
    const first = apply(startState, { command: 'filterInsert', node: condition });
    const second = apply(first, {
      command: 'filterInsert',
      node: { ...condition, propertyKey: 'owner', value: 'ana' },
    });
    const firstId = firstConditionId(second);

    const state = apply(second, { command: 'filterUpdate', id: firstId, patch: { value: 'closed' } });

    expect(JSON.stringify(state.configuration.filter)).toContain('closed');
    expect(JSON.stringify(state.configuration.filter)).toContain('ana');
  });

  test('filterRemove drops a node by id and refuses an id that is not there', () => {
    const first = apply(startState, { command: 'filterInsert', node: condition });
    const id = firstConditionId(first);

    const removed = apply(first, { command: 'filterRemove', id });
    const missing = applyPageViewOperation(first, { command: 'filterRemove', id: 'nothing' }, context);

    expect(JSON.stringify(removed.configuration.filter)).not.toContain('status');
    expect(missing.isFail()).toBe(true);
  });
});

const firstConditionId = (state: PageViewState): string => {
  const filter = state.configuration.filter;
  if (filter?.kind !== 'GROUP') throw new Error('no filter group');
  const id = filter.conditions.map((condition) => condition.id).find((candidate) => candidate !== undefined);
  if (id === undefined) throw new Error('no condition id');
  return id;
};
