import { describe, expect, it } from 'bun:test';
import { DatabasePropertyType } from '@neuma/db';
import { DEFAULT_PAGE_PROPERTY_CONFIG } from '@neuma/shared';
import type { SchemaPropertyDefinition } from '@/common/domain/schema.domain.types';
import {
  findInvalidRowValue,
  findUnattachableFile,
  listCollectionsOfValueWrites,
  listRowFileIds,
  listRowValueWrites,
} from '@/modules/blocks/domain/block.row-values.domain';
import { buildBlock, buildPage } from '../block.test-data';

const definition = (
  key: string,
  type: DatabasePropertyType,
  overrides: Partial<SchemaPropertyDefinition> = {},
): SchemaPropertyDefinition => ({
  config: DEFAULT_PAGE_PROPERTY_CONFIG,
  key,
  label: key,
  options: null,
  required: false,
  type,
  ...overrides,
});

const schema: readonly SchemaPropertyDefinition[] = [
  definition('title', DatabasePropertyType.TITLE, { required: true }),
  definition('status', DatabasePropertyType.SELECT, {
    options: [
      { color: null, group: null, id: 'todo0001', value: 'todo' },
      { color: null, group: null, id: 'done0001', value: 'done' },
    ],
  }),
  definition('owner', DatabasePropertyType.PERSON),
  definition('files', DatabasePropertyType.FILES),
  definition('number', DatabasePropertyType.UNIQUE_ID),
];
const schemas = new Map([['board', schema]]);

const row = (id: string, values: Record<string, unknown>, title = 'Row') =>
  buildPage({ id, parentId: 'board', properties: { title: [{ insert: title }], values }, text: title });

describe('listRowValueWrites', () => {
  it('lists the rows of a collection whose values changed, with only the keys that changed', () => {
    const before = new Map([['r1', row('r1', { status: 'todo0001', owner: 'ana' })]]);
    const writes = [{ block: row('r1', { owner: 'ana', status: 'done0001' }), isNew: false }];

    expect(listRowValueWrites(writes, before, schemas)).toEqual([
      {
        changedKeys: ['status'],
        collectionId: 'board',
        rowId: 'r1',
        title: 'Row',
        values: { owner: 'ana', status: 'done0001' },
      },
    ]);
  });

  it('takes every key of a new row, but not the ones the server fills', () => {
    const writes = [{ block: row('r2', { number: 7, status: 'todo0001' }), isNew: true }];

    expect(listRowValueWrites(writes, new Map(), schemas)[0]?.changedKeys).toEqual(['status']);
  });

  it('leaves out blocks that are not rows of a collection, rows whose values did not change, and templates', () => {
    const before = new Map([['r1', row('r1', { status: 'todo0001' })]]);
    const writes = [
      { block: row('r1', { status: 'todo0001' }), isNew: false },
      { block: buildBlock({ id: 'p1', parentId: 'board' }), isNew: true },
      { block: buildPage({ id: 'other', parentId: 'elsewhere', properties: { values: { a: 1 } } }), isNew: true },
      {
        block: buildPage({
          id: 'tpl',
          parentId: 'board',
          properties: { template: { isDefault: false }, title: [], values: { status: 'nope' } },
        }),
        isNew: true,
      },
    ];

    expect(listRowValueWrites(writes, before, schemas)).toEqual([]);
  });
});

describe('listCollectionsOfValueWrites', () => {
  it('names the parents of the pages whose values changed, so only those schemas are read', () => {
    const before = new Map([['r1', row('r1', { status: 'todo0001' })]]);
    const writes = [
      { block: row('r1', { status: 'done0001' }), isNew: false },
      { block: row('r2', {}), isNew: true },
      { block: buildPage({ id: 'r3', parentId: 'other', properties: { values: { a: 1 } } }), isNew: true },
      { block: buildBlock({ id: 'text', parentId: 'r1' }), isNew: true },
    ];

    expect(listCollectionsOfValueWrites(writes, before).toSorted()).toEqual(['board', 'other']);
  });

  it('names none when a transaction touches no values, as typing does', () => {
    const before = new Map([['r1', row('r1', { status: 'todo0001' })]]);

    expect(listCollectionsOfValueWrites([{ block: row('r1', { status: 'todo0001' }), isNew: false }], before)).toEqual(
      [],
    );
  });
});

describe('findInvalidRowValue', () => {
  const write = (values: Record<string, unknown>, changedKeys: string[]) => ({
    changedKeys,
    collectionId: 'board',
    rowId: 'r1',
    title: 'Row',
    values,
  });
  const members = new Set(['ana']);

  it('accepts options of the schema and people of the workspace', () => {
    const checked = findInvalidRowValue(
      [write({ owner: ['ana'], status: 'done0001' }, ['owner', 'status'])],
      schemas,
      members,
    );

    expect(checked).toBeNull();
  });

  it('refuses an option id the column does not have, as a stale copy of the schema would send', () => {
    const checked = findInvalidRowValue([write({ status: 'gone0001' }, ['status'])], schemas, members);

    expect(checked).toEqual({ message: 'Invalid value for status', rowId: 'r1' });
  });

  it('refuses a person outside the workspace and a key the schema does not have', () => {
    expect(findInvalidRowValue([write({ owner: ['eve'] }, ['owner'])], schemas, members)?.message).toBe(
      'Invalid value for owner',
    );
    expect(findInvalidRowValue([write({ ghost: 1 }, ['ghost'])], schemas, members)?.message).toBe(
      'Invalid value for ghost',
    );
  });
});

describe('files named by a row', () => {
  const written = [
    {
      changedKeys: ['files'],
      collectionId: 'board',
      rowId: 'r1',
      title: 'Row',
      values: { files: ['mine', 'attached', 7] },
    },
  ];

  it('lists the file ids a row names, once, and nothing for a row that names none', () => {
    expect(listRowFileIds(written, schemas)).toEqual(new Map([['r1', ['mine', 'attached']]]));
    expect(listRowFileIds([{ ...written[0], changedKeys: ['status'] }] as typeof written, schemas)).toEqual(new Map());
  });

  it('accepts a file the writer owns or the row already holds, and refuses any other', () => {
    const files = new Map([['r1', ['mine', 'attached']]]);
    const mine = { id: 'mine', ownerId: 'user-1', pageId: null };
    const attached = { id: 'attached', ownerId: 'someone', pageId: 'r1' };
    const attachedElsewhere = { id: 'attached', ownerId: 'someone', pageId: 'r9' };

    expect(findUnattachableFile(files, [mine, attached], 'user-1')).toBeNull();
    expect(findUnattachableFile(files, [mine, attachedElsewhere], 'user-1')).toBe('attached');
    expect(findUnattachableFile(files, [mine], 'user-1')).toBe('attached');
  });
});
