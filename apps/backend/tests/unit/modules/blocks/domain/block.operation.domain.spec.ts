import { describe, expect, it } from 'bun:test';
import { Result } from '@neuma/shared';
import { Doc, encodeStateAsUpdate, encodeStateVector } from 'yjs';
import { applyBlockOperation, placeChild } from '@/modules/blocks/domain/block.operation.domain';
import type {
  BlockEditOperation,
  BlockTextEngine,
  BlockTextUpdateApplier,
} from '@/modules/blocks/domain/block.transaction.domain.types';
import { blockTextEngine } from '@/modules/blocks/utils/block.text.utils';
import { buildBlock } from '../block.test-data';

const readTitle = (title: unknown): string =>
  Array.isArray(title) ? title.map((segment: { insert: string }) => segment.insert).join('') : '';

const apply = (operation: BlockEditOperation, block = buildBlock({ id: 'b1' }), engine = blockTextEngine) => {
  const applied = applyBlockOperation(block, operation, engine);
  if (applied.isFail()) throw applied.getError();
  return applied.getValue();
};

describe('placeChild', () => {
  const children = ['a', 'b', 'c'];

  it('puts the child right after its anchor', () => {
    expect(placeChild(children, 'x', { anchorId: 'a', side: 'after' })).toEqual(['a', 'x', 'b', 'c']);
  });

  it('puts the child right before its anchor', () => {
    expect(placeChild(children, 'x', { anchorId: 'c', side: 'before' })).toEqual(['a', 'b', 'x', 'c']);
  });

  it('appends after a missing anchor and prepends before a missing one', () => {
    expect(placeChild(children, 'x', { anchorId: 'gone', side: 'after' })).toEqual(['a', 'b', 'c', 'x']);
    expect(placeChild(children, 'x', { anchorId: 'gone', side: 'before' })).toEqual(['x', 'a', 'b', 'c']);
    expect(placeChild(children, 'x', { anchorId: null, side: 'after' })).toEqual(['a', 'b', 'c', 'x']);
    expect(placeChild(children, 'x', { anchorId: null, side: 'before' })).toEqual(['x', 'a', 'b', 'c']);
  });

  it('moves a child that is already listed instead of listing it twice', () => {
    expect(placeChild(children, 'c', { anchorId: 'a', side: 'before' })).toEqual(['c', 'a', 'b']);
  });
});

describe('applyBlockOperation', () => {
  it('replaces the fields named by a patch and nothing else', () => {
    const next = apply({ blockId: 'b1', command: 'patchFields', patch: { alive: false, type: 'heading' } });

    expect(next).toMatchObject({ alive: false, parentId: null, type: 'heading', version: 1 });
  });

  it('sets one entry of properties or format and merges several', () => {
    const block = buildBlock({ format: { textColor: 'red' }, id: 'b1', properties: { checked: false, title: [] } });

    const withEntry = apply(
      { bag: 'properties', blockId: 'b1', command: 'replaceEntry', key: 'checked', value: true },
      block,
    );
    const withValues = apply(
      { bag: 'format', blockId: 'b1', command: 'mergeEntries', values: { backgroundColor: 'blue' } },
      block,
    );

    expect(withEntry.properties).toEqual({ checked: true, title: [] });
    expect(withValues.format).toEqual({ backgroundColor: 'blue', textColor: 'red' });
  });

  it('treats a missing format as an empty one when an entry is set', () => {
    const next = apply({ bag: 'format', blockId: 'b1', command: 'replaceEntry', key: 'open', value: true });

    expect(next.format).toEqual({ open: true });
  });

  it('inserts and removes children relative to a sibling', () => {
    const block = buildBlock({ children: ['a', 'b'], id: 'b1' });

    const inserted = apply(
      { blockId: 'b1', childId: 'x', command: 'insertChild', placement: { anchorId: 'a', side: 'after' } },
      block,
    );
    const removed = apply({ blockId: 'b1', childId: 'a', command: 'removeChild' }, inserted);

    expect(inserted.children).toEqual(['a', 'x', 'b']);
    expect(removed.children).toEqual(['x', 'b']);
  });

  it('replaces the permissions of the block', () => {
    const permissions = [{ principal: { kind: 'space' as const }, role: 'reader' as const }];

    expect(apply({ blockId: 'b1', command: 'setPermissions', permissions }).permissions).toEqual(permissions);
  });

  it('writes the merged text and its state when applyText succeeds', () => {
    const merge: BlockTextUpdateApplier = () =>
      Result.ok({ textState: new Uint8Array([7]), value: [{ insert: 'Merged' }] });
    const engine: BlockTextEngine = { ...blockTextEngine, merge };

    const next = apply(
      { blockId: 'b1', command: 'applyText', property: 'title', update: new Uint8Array([1]) },
      undefined,
      engine,
    );

    expect(next.properties).toEqual({ title: [{ insert: 'Merged' }] });
    expect(next.textState).toEqual(new Uint8Array([7]));
  });

  describe('applyText on a block that has text but no Yjs state', () => {
    const legacy = buildBlock({ id: 'b1', properties: { title: [{ insert: 'Legacy' }] } });
    const applyText = (update: Uint8Array) =>
      applyBlockOperation(legacy, { blockId: 'b1', command: 'applyText', property: 'title', update }, blockTextEngine);

    it('builds the state from the stored text first, so the text is never lost', () => {
      const standalone = new Doc();
      standalone.getText('title').insert(0, '!');

      const applied = applyText(encodeStateAsUpdate(standalone));

      expect(readTitle(applied.getValue().properties.title)).toContain('Legacy');
      expect(readTitle(applied.getValue().properties.title)).toContain('!');
      expect(applied.getValue().textState).not.toBeNull();
    });

    it('rejects an update built on a different history, asking the client to resync', () => {
      const unsynced = new Doc();
      unsynced.getText('title').insert(0, 'Legacy');
      const before = encodeStateVector(unsynced);
      unsynced.getText('title').insert(6, '!');

      const applied = applyText(encodeStateAsUpdate(unsynced, before));

      expect(applied.isFail() && applied.getError().code).toBe('BLOCK_TEXT_OUT_OF_SYNC');
    });
  });

  describe('removing a key', () => {
    const block = buildBlock({ format: { open: true, textColor: 'red' }, id: 'b1', properties: { checked: true } });

    it('deletes the keys given as null when an update merges into properties or format', () => {
      const format = apply(
        { bag: 'format', blockId: 'b1', command: 'mergeEntries', values: { textColor: null } },
        block,
      );
      const properties = apply(
        { bag: 'properties', blockId: 'b1', command: 'mergeEntries', values: { checked: null } },
        block,
      );

      expect(format.format).toEqual({ open: true });
      expect(properties.properties).toEqual({});
    });

    it('clears the Yjs text when the rich text property is deleted', () => {
      const withText = apply({
        bag: 'properties',
        blockId: 'b1',
        command: 'replaceEntry',
        key: 'title',
        value: [{ insert: 'Kept' }],
      });

      const cleared = apply(
        { bag: 'properties', blockId: 'b1', command: 'mergeEntries', values: { title: null } },
        withText,
      );

      expect(cleared.properties).toEqual({});
      expect(cleared.textState).not.toBeNull();
    });
  });

  describe('the Yjs text of the block', () => {
    it('is written by a direct write of a rich text property, and properties mirror it', () => {
      const next = apply({
        bag: 'properties',
        blockId: 'b1',
        command: 'replaceEntry',
        key: 'title',
        value: [{ attributes: { strong: true }, insert: 'Direct' }],
      });

      expect(next.textState).not.toBeNull();
      expect(next.properties).toEqual({ title: [{ attributes: { strong: true }, insert: 'Direct' }] });
    });

    it('keeps following direct writes after an earlier one, replacing the whole text each time', () => {
      const first = apply({
        blockId: 'b1',
        command: 'patchFields',
        patch: { properties: { title: [{ insert: 'One' }] } },
      });

      const second = apply(
        { blockId: 'b1', command: 'patchFields', patch: { properties: { title: [{ insert: 'Two' }] } } },
        first,
      );

      expect(readTitle(second.properties.title)).toBe('Two');
      expect(second.textState).not.toEqual(first.textState);
    });

    it('is left alone by writes to other properties and by a rewrite of the same text', () => {
      const withText = apply({
        blockId: 'b1',
        command: 'patchFields',
        patch: { properties: { title: [{ insert: 'Kept' }] } },
      });

      const checked = apply(
        { bag: 'properties', blockId: 'b1', command: 'replaceEntry', key: 'checked', value: true },
        withText,
      );
      const same = apply(
        {
          blockId: 'b1',
          command: 'patchFields',
          patch: { properties: { checked: true, title: [{ insert: 'Kept' }] } },
        },
        checked,
      );

      expect(checked.textState).toEqual(withText.textState);
      expect(same.textState).toEqual(withText.textState);
    });
  });
});
