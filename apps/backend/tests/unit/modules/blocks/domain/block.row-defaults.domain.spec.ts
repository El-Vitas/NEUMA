import { describe, expect, it } from 'bun:test';
import {
  countNewRowsPerUniqueId,
  findServerAssignedWrite,
  stampNewRows,
  toUniqueIdDemandKey,
} from '@/modules/blocks/domain/block.row-defaults.domain';
import type {
  BlockOperation,
  CollectionRowRules,
  WorkingBlock,
} from '@/modules/blocks/domain/block.transaction.domain.types';
import { buildPage } from '../block.test-data';

const createRow = (blockId: string, parentId: string, values: Record<string, unknown> = {}): BlockOperation => ({
  blockId,
  command: 'create',
  fields: { format: null, parentId, properties: { title: [], values }, type: 'page' },
});

const rules: ReadonlyMap<string, CollectionRowRules> = new Map([
  [
    'tasks',
    {
      serverAssignedKeys: ['code', 'author'],
      statusDefaults: [{ key: 'stage', optionId: 'next0001' }],
      uniqueIdKeys: ['code'],
    },
  ],
  ['notes', { serverAssignedKeys: [], statusDefaults: [], uniqueIdKeys: [] }],
]);

const rowAt = (id: string, parentId: string, values: Record<string, unknown>): WorkingBlock =>
  buildPage({ id, parentId, properties: { title: [], values } });

const indexed = (...rows: WorkingBlock[]): ReadonlyMap<string, WorkingBlock> =>
  new Map(rows.map((row) => [row.id, row]));

const valuesOf = (operation: BlockOperation | undefined): unknown =>
  operation?.command === 'create' ? operation.fields.properties.values : undefined;

describe('countNewRowsPerUniqueId', () => {
  it('counts the rows a transaction creates under each collection that numbers its rows', () => {
    const operations = [createRow('a', 'tasks'), createRow('b', 'tasks'), createRow('c', 'notes')];

    expect(countNewRowsPerUniqueId(operations, rules)).toEqual([{ collectionId: 'tasks', count: 2, key: 'code' }]);
  });

  it('counts nothing for a block that is not a row', () => {
    const paragraph: BlockOperation = {
      blockId: 'p',
      command: 'create',
      fields: { format: null, parentId: 'tasks', properties: {}, type: 'paragraph' },
    };

    expect(countNewRowsPerUniqueId([paragraph], rules)).toEqual([]);
  });
});

describe('findServerAssignedWrite', () => {
  it('finds a unique id or an author field that a row changed', () => {
    const before = indexed(rowAt('r', 'tasks', { code: 1, stage: 'a' }));

    expect(findServerAssignedWrite(before, indexed(rowAt('r', 'tasks', { code: 2, stage: 'a' })), rules)).toBe('code');
    expect(findServerAssignedWrite(before, indexed(rowAt('r', 'tasks', { author: 'u', code: 1 })), rules)).toBe(
      'author',
    );
  });

  it('lets a row change what the server does not assign, and keep what it assigned', () => {
    const before = indexed(rowAt('r', 'tasks', { code: 1, stage: 'a' }));

    expect(findServerAssignedWrite(before, indexed(rowAt('r', 'tasks', { code: 1, stage: 'b' })), rules)).toBeNull();
  });

  it('refuses a new row that names an author, and leaves the number to the stamp', () => {
    const none = indexed();

    expect(findServerAssignedWrite(none, indexed(rowAt('n', 'tasks', { author: 'u' })), rules)).toBe('author');
    expect(findServerAssignedWrite(none, indexed(rowAt('n', 'tasks', { code: 5 })), rules)).toBeNull();
  });

  it('looks at nothing outside a collection that assigns something', () => {
    const before = indexed(rowAt('r', 'notes', { code: 1 }));

    expect(findServerAssignedWrite(before, indexed(rowAt('r', 'notes', { code: 2 })), rules)).toBeNull();
    expect(findServerAssignedWrite(indexed(), indexed(rowAt('o', 'elsewhere', { code: 2 })), rules)).toBeNull();
  });
});

describe('stampNewRows', () => {
  const first = new Map([[toUniqueIdDemandKey('tasks', 'code'), 7]]);

  it('numbers the new rows one after the other, from the number the counter handed out', () => {
    const stamped = stampNewRows([createRow('a', 'tasks'), createRow('b', 'tasks')], rules, first);

    expect(valuesOf(stamped[0])).toMatchObject({ code: 7 });
    expect(valuesOf(stamped[1])).toMatchObject({ code: 8 });
  });

  it('replaces a number the client wrote, because only the server decides it', () => {
    const stamped = stampNewRows([createRow('a', 'tasks', { code: 999 })], rules, first);

    expect(valuesOf(stamped[0])).toMatchObject({ code: 7 });
  });

  it('starts a new row on the default of each status and keeps one the client chose', () => {
    const stamped = stampNewRows(
      [createRow('a', 'tasks'), createRow('b', 'tasks', { stage: 'done0001' })],
      rules,
      first,
    );

    expect(valuesOf(stamped[0])).toMatchObject({ stage: 'next0001' });
    expect(valuesOf(stamped[1])).toMatchObject({ stage: 'done0001' });
  });

  it('leaves alone a row of a collection with nothing to stamp, and what is not a creation', () => {
    const edit: BlockOperation = { blockId: 'x', command: 'patchFields', patch: { alive: true } };
    const operations = [createRow('n', 'notes'), edit];

    expect(stampNewRows(operations, rules, first)).toEqual(operations);
  });
});
