import { describe, expect, test } from 'bun:test';
import { applyPageViewOperation } from './page-view.operations.lib.js';
import { diffPageViewConfigurations } from './page-view.operations.diff.lib.js';
import type { PageViewOperationContext, PageViewState } from './page-view.operations.types.js';
import { EMPTY_PAGE_VIEW_CONFIGURATION } from './page-view.schemas.js';
import type { PageFilter, PageViewConfiguration } from './page-view.types.js';

let nextId = 0;
const context: PageViewOperationContext = {
  collectionOrder: [],
  createId: () => {
    nextId += 1;
    return `n${String(nextId)}`;
  },
  propertyKeys: ['a', 'b', 'c'],
};

const base: PageViewConfiguration = EMPTY_PAGE_VIEW_CONFIGURATION;

const replay = (before: PageViewConfiguration, after: PageViewConfiguration): PageViewConfiguration => {
  let state: PageViewState = { configuration: before, manualOrder: null };
  for (const operation of diffPageViewConfigurations(before, after)) {
    const result = applyPageViewOperation(state, operation, context);
    if (result.isFail()) throw new Error(result.getError().message);
    state = result.getValue();
  }
  return state.configuration;
};

describe('diffing two configurations into operations', () => {
  test('says nothing when nothing changed', () => {
    expect(diffPageViewConfigurations(base, base)).toEqual([]);
  });

  test('turns a changed scalar into a set of that key alone', () => {
    const operations = diffPageViewConfigurations(base, { ...base, groupBy: 'status', frozenColumns: 2 });

    expect(operations).toEqual([
      { command: 'set', key: 'frozenColumns', value: 2 },
      { command: 'set', key: 'groupBy', value: 'status' },
    ]);
  });

  test('turns the entries of a map into one operation per key that changed', () => {
    const before = { ...base, columnWidths: { a: 100, b: 200 } };
    const after = { ...base, columnWidths: { a: 100, b: 250, c: 300 } };

    expect(diffPageViewConfigurations(before, after)).toEqual([
      { command: 'setEntry', key: 'b', map: 'columnWidths', value: 250 },
      { command: 'setEntry', key: 'c', map: 'columnWidths', value: 300 },
    ]);
    expect(diffPageViewConfigurations(after, before)).toEqual([
      { command: 'setEntry', key: 'b', map: 'columnWidths', value: 200 },
      { command: 'removeEntry', key: 'c', map: 'columnWidths' },
    ]);
  });

  const cases: [string, PageViewConfiguration, PageViewConfiguration][] = [
    ['a list that gains an item', { ...base, hiddenGroups: ['x'] }, { ...base, hiddenGroups: ['x', 'y'] }],
    ['a list that loses an item', { ...base, hiddenGroups: ['x', 'y'] }, { ...base, hiddenGroups: ['y'] }],
    [
      'a list that is reordered',
      { ...base, visibleProperties: ['a', 'b', 'c'] },
      { ...base, visibleProperties: ['c', 'a', 'b'] },
    ],
    ['all properties becoming a chosen few', base, { ...base, visibleProperties: ['b', 'a'] }],
    [
      'a timeline that gains its end, its scale and a cover',
      base,
      { ...base, cardSize: 'LARGE', coverProperty: 'photos', dateScale: 'WEEK', endDateProperty: 'due' },
    ],
    [
      'a table that wraps one column and then another',
      { ...base, columnWraps: { notes: true } },
      { ...base, columnWraps: { summary: true } },
    ],
    [
      'sorts that gain, flip and lose',
      {
        ...base,
        sorts: [
          { direction: 'ASCENDING', propertyKey: 'a' },
          { direction: 'ASCENDING', propertyKey: 'b' },
        ],
      },
      {
        ...base,
        sorts: [
          { direction: 'DESCENDING', propertyKey: 'b' },
          { direction: 'ASCENDING', propertyKey: 'c' },
        ],
      },
    ],
  ];

  test.each(cases)('replays %s to the same result', (_name, before, after) => {
    expect(replay(before, after)).toEqual(after);
  });

  const condition = (id: string | undefined, propertyKey: string, value: string): PageFilter => ({
    ...(id === undefined ? {} : { id }),
    kind: 'CONDITION',
    operator: 'IS',
    propertyKey,
    value,
  });
  const group = (id: string, ...conditions: PageFilter[]): PageFilter => ({
    conditions,
    id,
    kind: 'GROUP',
    operator: 'AND',
  });

  test('inserts, updates and removes filter nodes by their ids and leaves the others alone', () => {
    const before = { ...base, filter: group('root', condition('c1', 'a', 'x'), condition('c2', 'b', 'y')) };
    const after = { ...base, filter: group('root', condition('c1', 'a', 'z'), condition('c3', 'c', 'w')) };

    const operations = diffPageViewConfigurations(before, after);

    expect(
      operations.map((operation) => operation.command).sort((first, second) => first.localeCompare(second)),
    ).toEqual(['filterInsert', 'filterRemove', 'filterUpdate']);
    expect(replay(before, after).filter).toMatchObject({ conditions: [{ id: 'c1', value: 'z' }, { value: 'w' }] });
  });

  test('inserts a whole filter when the view had none, and removes it when it is cleared', () => {
    const filter = group('root', condition('c1', 'a', 'x'));

    expect(diffPageViewConfigurations(base, { ...base, filter }).map((operation) => operation.command)).toEqual([
      'filterInsert',
    ]);
    expect(diffPageViewConfigurations({ ...base, filter }, base).map((operation) => operation.command)).toEqual([
      'filterRemove',
    ]);
  });

  test('gives ids to the nodes the editor added without one, so they can be told apart', () => {
    const before = { ...base, filter: group('root', condition('c1', 'a', 'x')) };
    const after = { ...base, filter: group('root', condition('c1', 'a', 'x'), condition(undefined, 'b', 'y')) };

    const operations = diffPageViewConfigurations(before, after);

    expect(operations).toHaveLength(1);
    expect(operations[0]?.command).toBe('filterInsert');
  });
});
