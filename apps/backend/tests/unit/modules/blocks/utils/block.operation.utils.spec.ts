import { describe, expect, it } from 'bun:test';
import type { BlockOperation } from '@/modules/blocks/domain/block.transaction.domain.types';
import {
  hasParentWrite,
  listOperationBlockIds,
  parseBlockOperation,
  parseBlockOperations,
} from '@/modules/blocks/utils/block.operation.utils';

const pointer = (id: string) => ({ id, table: 'block' });

const parseValue = (raw: unknown): BlockOperation => {
  const parsed = parseBlockOperation(raw);
  if (parsed.isFail()) throw parsed.getError();
  return parsed.getValue();
};

const parseCode = (raw: unknown): string => {
  const parsed = parseBlockOperation(raw);
  if (parsed.isOk()) throw new Error('Expected the operation to be refused');
  return parsed.getError().code;
};

describe('parseBlockOperation', () => {
  it('reads set with an empty path as the creation of a block', () => {
    const operation = parseValue({
      args: { id: 'b1', parentId: 'p1', properties: { title: [{ insert: 'Hi' }] }, type: 'paragraph' },
      command: 'set',
      path: [],
      pointer: pointer('b1'),
    });

    expect(operation).toEqual({
      blockId: 'b1',
      command: 'create',
      fields: { format: null, parentId: 'p1', properties: { title: [{ insert: 'Hi' }] }, type: 'paragraph' },
    });
  });

  it('refuses a creation whose id differs from its pointer', () => {
    expect(
      parseCode({
        args: { id: 'other', parentId: null, type: 'page' },
        command: 'set',
        path: [],
        pointer: pointer('b1'),
      }),
    ).toBe('BLOCK_OPERATION_INVALID');
  });

  it('reads set on a field path as a patch of that one field', () => {
    expect(parseValue({ args: false, command: 'set', path: ['alive'], pointer: pointer('b1') })).toEqual({
      blockId: 'b1',
      command: 'patchFields',
      patch: { alive: false },
    });
  });

  it('reads set on a bag and a key as the replacement of one entry', () => {
    expect(parseValue({ args: 'red', command: 'set', path: ['format', 'textColor'], pointer: pointer('b1') })).toEqual({
      bag: 'format',
      blockId: 'b1',
      command: 'replaceEntry',
      key: 'textColor',
      value: 'red',
    });
  });

  it('reads update on the block, on properties and on format', () => {
    expect(parseValue({ args: { type: 'heading' }, command: 'update', path: [], pointer: pointer('b1') })).toEqual({
      blockId: 'b1',
      command: 'patchFields',
      patch: { type: 'heading' },
    });
    expect(
      parseValue({ args: { checked: true }, command: 'update', path: ['properties'], pointer: pointer('b1') }),
    ).toEqual({ bag: 'properties', blockId: 'b1', command: 'mergeEntries', values: { checked: true } });
    expect(parseValue({ args: { open: true }, command: 'update', path: ['format'], pointer: pointer('b1') })).toEqual({
      bag: 'format',
      blockId: 'b1',
      command: 'mergeEntries',
      values: { open: true },
    });
  });

  it.each([
    'version',
    'text',
    'textState',
    'permissions',
    'createdById',
    'spaceId',
    'children',
    'lockedAt',
    'lifecycle',
  ])('refuses to write %s through update, set and creation', (field) => {
    expect(parseCode({ args: { [field]: 1 }, command: 'update', path: [], pointer: pointer('b1') })).toBe(
      'BLOCK_FIELD_NOT_WRITABLE',
    );
    expect(parseCode({ args: 1, command: 'set', path: [field], pointer: pointer('b1') })).toBe(
      'BLOCK_FIELD_NOT_WRITABLE',
    );
    expect(
      parseCode({
        args: { id: 'b1', parentId: null, type: 'page', [field]: 1 },
        command: 'set',
        path: [],
        pointer: pointer('b1'),
      }),
    ).toBe('BLOCK_FIELD_NOT_WRITABLE');
  });

  it('reads null inside properties or format as the removal of that key, and null at the top only where nullable', () => {
    expect(
      parseValue({ args: { textColor: null }, command: 'update', path: ['format'], pointer: pointer('b1') }),
    ).toEqual({ bag: 'format', blockId: 'b1', command: 'mergeEntries', values: { textColor: null } });
    expect(parseValue({ args: { parentId: null }, command: 'update', path: [], pointer: pointer('b1') })).toEqual({
      blockId: 'b1',
      command: 'patchFields',
      patch: { parentId: null },
    });
    expect(parseValue({ args: { format: null }, command: 'update', path: [], pointer: pointer('b1') })).toEqual({
      blockId: 'b1',
      command: 'patchFields',
      patch: { format: null },
    });
    expect(parseCode({ args: { alive: null }, command: 'update', path: [], pointer: pointer('b1') })).toBe(
      'BLOCK_OPERATION_INVALID',
    );
    expect(parseCode({ args: { type: null }, command: 'update', path: [], pointer: pointer('b1') })).toBe(
      'BLOCK_OPERATION_INVALID',
    );
    expect(parseCode({ args: { properties: null }, command: 'update', path: [], pointer: pointer('b1') })).toBe(
      'BLOCK_OPERATION_INVALID',
    );
  });

  it('reads the list commands with and without an anchor', () => {
    expect(
      parseValue({ args: { after: 'a', id: 'c' }, command: 'listAfter', path: ['children'], pointer: pointer('p') }),
    ).toEqual({ blockId: 'p', childId: 'c', command: 'insertChild', placement: { anchorId: 'a', side: 'after' } });
    expect(parseValue({ args: { id: 'c' }, command: 'listBefore', path: ['children'], pointer: pointer('p') })).toEqual(
      { blockId: 'p', childId: 'c', command: 'insertChild', placement: { anchorId: null, side: 'before' } },
    );
    expect(parseValue({ args: { id: 'c' }, command: 'listRemove', path: ['children'], pointer: pointer('p') })).toEqual(
      {
        blockId: 'p',
        childId: 'c',
        command: 'removeChild',
      },
    );
  });

  it('refuses a list command that does not address children, or that names the wrong side', () => {
    expect(parseCode({ args: { id: 'c' }, command: 'listAfter', path: [], pointer: pointer('p') })).toBe(
      'BLOCK_OPERATION_INVALID',
    );
    expect(
      parseCode({ args: { before: 'a', id: 'c' }, command: 'listAfter', path: ['children'], pointer: pointer('p') }),
    ).toBe('BLOCK_OPERATION_INVALID');
  });

  it('decodes the base64 update of applyText', () => {
    const operation = parseValue({
      args: { property: 'title', update: Buffer.from([1, 2, 3]).toString('base64') },
      command: 'applyText',
      path: [],
      pointer: pointer('b1'),
    });

    expect(operation).toEqual({
      blockId: 'b1',
      command: 'applyText',
      property: 'title',
      update: new Uint8Array([1, 2, 3]),
    });
  });

  it('refuses an applyText that is not base64 or names a property with odd characters', () => {
    expect(
      parseCode({ args: { property: 'title', update: '***' }, command: 'applyText', path: [], pointer: pointer('b') }),
    ).toBe('BLOCK_OPERATION_INVALID');
    expect(
      parseCode({
        args: { property: '__proto__', update: 'AQID' },
        command: 'applyText',
        path: [],
        pointer: pointer('b'),
      }),
    ).toBe('BLOCK_OPERATION_INVALID');
  });

  it('validates the permissions of setPermission', () => {
    const permissions = [{ principal: { kind: 'space' as const }, role: 'reader' as const }];

    expect(parseValue({ args: { permissions }, command: 'setPermission', path: [], pointer: pointer('b1') })).toEqual({
      blockId: 'b1',
      command: 'setPermissions',
      permissions,
    });
    expect(
      parseCode({
        args: { permissions: [{ role: 'root' }] },
        command: 'setPermission',
        path: [],
        pointer: pointer('b1'),
      }),
    ).toBe('BLOCK_OPERATION_INVALID');
  });

  it('refuses an unknown command, another table and extra keys in the envelope', () => {
    expect(parseCode({ args: {}, command: 'drop', path: [], pointer: pointer('b1') })).toBe('BLOCK_OPERATION_INVALID');
    expect(parseCode({ args: {}, command: 'update', path: [], pointer: { id: 'b1', table: 'space' } })).toBe(
      'BLOCK_OPERATION_INVALID',
    );
    expect(parseCode({ args: {}, command: 'update', extra: 1, path: [], pointer: pointer('b1') })).toBe(
      'BLOCK_OPERATION_INVALID',
    );
  });
});

describe('parseBlockOperation, relations', () => {
  it('reads addRelation with the property, the row it points to and where it goes', () => {
    const operation = parseValue({
      args: { after: 'r0', property: 'project', targetId: 'r1' },
      command: 'addRelation',
      path: [],
      pointer: pointer('row-1'),
    });

    expect(operation).toEqual({
      afterId: 'r0',
      blockId: 'row-1',
      command: 'addRelation',
      property: 'project',
      targetId: 'r1',
    });
  });

  it('puts the row last when addRelation names no anchor', () => {
    const operation = parseValue({
      args: { property: 'project', targetId: 'r1' },
      command: 'addRelation',
      path: [],
      pointer: pointer('row-1'),
    });

    expect(operation).toMatchObject({ afterId: null });
  });

  it('reads removeRelation', () => {
    const operation = parseValue({
      args: { property: 'project', targetId: 'r1' },
      command: 'removeRelation',
      path: [],
      pointer: pointer('row-1'),
    });

    expect(operation).toEqual({ blockId: 'row-1', command: 'removeRelation', property: 'project', targetId: 'r1' });
  });

  it('refuses a relation command that carries the mirror flag or an unknown argument', () => {
    expect(
      parseCode({
        args: { isMirror: true, property: 'project', targetId: 'r1' },
        command: 'addRelation',
        path: [],
        pointer: pointer('row-1'),
      }),
    ).toBe('BLOCK_OPERATION_INVALID');
  });

  it('refuses a relation command addressed to a path', () => {
    expect(
      parseCode({
        args: { property: 'project', targetId: 'r1' },
        command: 'addRelation',
        path: ['properties'],
        pointer: pointer('row-1'),
      }),
    ).toBe('BLOCK_OPERATION_INVALID');
  });

  it('lists the row it points to among the rows to lock', () => {
    const operations = [
      parseValue({
        args: { property: 'project', targetId: 'r1' },
        command: 'addRelation',
        path: [],
        pointer: pointer('row-1'),
      }),
    ];

    expect(listOperationBlockIds(operations).toSorted()).toEqual(['r1', 'row-1']);
  });
});

describe('parseBlockOperations', () => {
  it('names the position of the operation that cannot be read', () => {
    const parsed = parseBlockOperations([
      { args: { alive: true }, command: 'update', path: [], pointer: pointer('b1') },
      { args: {}, command: 'bogus', path: [], pointer: pointer('b1') },
    ]);

    expect(parsed.isFail()).toBe(true);
    expect(parsed.getError().details).toMatchObject({ index: 1 });
  });
});

describe('listOperationBlockIds and hasParentWrite', () => {
  const operations: BlockOperation[] = [
    { blockId: 'b1', command: 'create', fields: { format: null, parentId: 'p1', properties: {}, type: 'paragraph' } },
    { blockId: 'p1', childId: 'b1', command: 'insertChild', placement: { anchorId: 'a1', side: 'after' } },
    { blockId: 'm1', command: 'patchFields', patch: { parentId: 'p2' } },
  ];

  it('lists every block named as a pointer or as an argument once', () => {
    expect(listOperationBlockIds(operations).toSorted()).toEqual(['a1', 'b1', 'm1', 'p1', 'p2']);
  });

  it('flags a transaction that writes a parent', () => {
    expect(hasParentWrite(operations)).toBe(true);
    expect(hasParentWrite(operations.slice(0, 2))).toBe(false);
  });
});
