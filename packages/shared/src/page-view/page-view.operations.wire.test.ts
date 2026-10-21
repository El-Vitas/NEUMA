import { describe, expect, test } from 'bun:test';
import type { PageViewOperation } from './page-view.operations.types.js';
import { readPageViewOperation, toPageViewEnvelope } from './page-view.operations.wire.js';

const operations: PageViewOperation[] = [
  { command: 'set', key: 'groupBy', value: 'status' },
  { command: 'setEntry', key: 'status', map: 'columnWidths', value: 200 },
  { command: 'removeEntry', key: 'status', map: 'columnWidths' },
  { after: 'r1', command: 'listAfter', id: 'r2', list: 'manualOrder' },
  { before: 'r1', command: 'listBefore', id: 'r2', list: 'manualOrder' },
  { command: 'listRemove', id: 'owner', list: 'visibleProperties' },
  { command: 'sortSet', direction: 'ASCENDING', propertyKey: 'status' },
  { command: 'sortRemove', propertyKey: 'status' },
  {
    command: 'filterInsert',
    node: { kind: 'CONDITION', operator: 'IS', propertyKey: 'status', value: 'open' },
  },
  { command: 'filterUpdate', id: 'abc', patch: { value: 'closed' } },
  { command: 'filterRemove', id: 'abc' },
];

describe('the wire form of a view operation', () => {
  test.each(operations)('reads back what it wrote: $command', (operation) => {
    const envelope = toPageViewEnvelope('view-1', operation);

    const read = readPageViewOperation(envelope);

    expect(read.isOk()).toBe(true);
    expect(read.getValue()).toEqual(operation);
    expect(envelope.pointer).toEqual({ id: 'view-1', table: 'view' });
  });

  test('refuses a key that is not a scalar of the configuration', () => {
    const read = readPageViewOperation({ args: 1, command: 'set', path: ['configuration', 'columnWidths'] });

    expect(read.isFail()).toBe(true);
  });

  test('refuses an unknown command and arguments that do not fit', () => {
    expect(readPageViewOperation({ args: {}, command: 'explode', path: [] }).isFail()).toBe(true);
    expect(
      readPageViewOperation({ args: { extra: 1, id: 'a' }, command: 'listRemove', path: ['manualOrder'] }).isFail(),
    ).toBe(true);
  });
});
