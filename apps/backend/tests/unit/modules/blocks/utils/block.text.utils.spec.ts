import { describe, expect, it } from 'bun:test';
import { blockRichTextSchema } from '@neuma/shared';
import { applyUpdate, Doc, encodeStateAsUpdate, encodeStateVector, type Text } from 'yjs';
import { applyBlockTextUpdate, replaceBlockText } from '@/modules/blocks/utils/block.text.utils';

const MENTION = { label: 'Plan', pageId: 'page-9', spaceId: 'space-1' };

/** A client starts from the state the server holds, edits its copy and sends only what changed. */
const editFrom = (base: Uint8Array | null, edit: (text: Text) => void): Uint8Array => {
  const doc = new Doc();
  if (base !== null) applyUpdate(doc, base);
  const before = encodeStateVector(doc);
  edit(doc.getText('title'));
  return encodeStateAsUpdate(doc, before);
};

const insertAbc = (): Uint8Array =>
  editFrom(null, (text) => {
    text.insert(0, 'abc');
  });

const apply = (textState: Uint8Array | null, update: Uint8Array) => {
  const applied = applyBlockTextUpdate({ property: 'title', textState, update });
  if (applied.isFail()) throw applied.getError();
  return applied.getValue();
};

const readText = (value: unknown): string =>
  blockRichTextSchema
    .parse(value)
    .map((segment) => (typeof segment.insert === 'string' ? segment.insert : '*'))
    .join('');

describe('applyBlockTextUpdate', () => {
  it('turns the first update into a state and the rich text of the property', () => {
    const update = editFrom(null, (text) => {
      text.insert(0, 'Hello');
    });

    const { textState, value } = apply(null, update);

    expect(readText(value)).toBe('Hello');
    expect(textState.byteLength).toBeGreaterThan(0);
  });

  it('merges two independent updates to the same text into the same result in either order', () => {
    const first = apply(null, insertAbc());
    const fromLeft = editFrom(first.textState, (text) => {
      text.insert(0, 'L-');
    });
    const fromRight = editFrom(first.textState, (text) => {
      text.insert(3, '-R');
    });

    const leftThenRight = apply(apply(first.textState, fromLeft).textState, fromRight);
    const rightThenLeft = apply(apply(first.textState, fromRight).textState, fromLeft);

    expect(readText(leftThenRight.value)).toBe('L-abc-R');
    expect(leftThenRight.value).toEqual(rightThenLeft.value);
  });

  it('keeps marks and a mention embed in the shared rich text shape', () => {
    const update = editFrom(null, (text) => {
      text.insert(0, 'Bold plain ');
      text.format(0, 4, { strong: true });
      text.insertEmbed(11, { mention: MENTION });
    });

    const { value } = apply(null, update);

    expect(blockRichTextSchema.parse(value)).toEqual([
      { attributes: { strong: true }, insert: 'Bold' },
      { insert: ' plain ' },
      { insert: { mention: MENTION } },
    ]);
  });

  describe('replaceBlockText', () => {
    const replace = (textState: Uint8Array | null, delta: unknown[]) => {
      const replaced = replaceBlockText({ delta, property: 'title', textState });
      if (replaced.isFail()) throw replaced.getError();
      return replaced.getValue();
    };

    it('writes a delta as the whole text, with its marks and embeds', () => {
      const delta = [{ attributes: { em: true as const }, insert: 'Seed' }, { insert: { mention: MENTION } }];

      const { textState, value } = replace(null, delta);

      expect(blockRichTextSchema.parse(value)).toEqual(delta);
      expect(textState.byteLength).toBeGreaterThan(0);
    });

    it('replaces what the text held before and can be emptied', () => {
      const first = replace(null, [{ insert: 'Old words' }]);

      const second = replace(first.textState, [{ insert: 'New' }]);
      const emptied = replace(second.textState, []);

      expect(readText(second.value)).toBe('New');
      expect(emptied.value).toEqual([]);
    });

    it('leaves a state a client can start from: its update merges with the replaced text', () => {
      const { textState } = replace(null, [{ attributes: { em: true }, insert: 'Seed' }]);
      const clientUpdate = editFrom(textState, (text) => {
        text.insert(4, '!');
      });

      const merged = apply(textState, clientUpdate);

      expect(readText(merged.value)).toBe('Seed!');
    });

    it('edits only the span that changed, so a concurrent deletion outside it still applies', () => {
      const base = replace(null, [{ insert: 'abc def' }]).textState;
      const clientDeletesTail = editFrom(base, (text) => {
        text.delete(3, 4);
      });

      const rewritten = replace(base, [{ insert: 'xyz def' }]);
      const merged = apply(rewritten.textState, clientDeletesTail);

      expect(readText(merged.value)).toBe('xyz');
    });

    it('keeps the items it did not touch, and compares marks as part of the text', () => {
      const base = replace(null, [{ insert: 'plain ' }, { attributes: { strong: true as const }, insert: 'bold' }]);

      const sameText = replace(base.textState, [
        { insert: 'plain ' },
        { attributes: { strong: true as const }, insert: 'bold' },
      ]);
      const unmarked = replace(base.textState, [{ insert: 'plain bold' }]);

      expect(sameText.textState).toEqual(base.textState);
      expect(unmarked.value).toEqual([{ insert: 'plain bold' }]);
    });

    it('measures embeds as one character and text in UTF-16 units like Yjs does', () => {
      const base = replace(null, [{ insert: 'a😀' }, { insert: { mention: MENTION } }, { insert: 'z' }]);

      const next = replace(base.textState, [{ insert: 'a😀' }, { insert: { mention: MENTION } }, { insert: 'Z' }]);

      expect(blockRichTextSchema.parse(next.value)).toEqual([
        { insert: 'a😀' },
        { insert: { mention: MENTION } },
        { insert: 'Z' },
      ]);
    });

    it('refuses a delta that is not made of segments', () => {
      const replaced = replaceBlockText({ delta: [{ insert: 42 }, 'nope'], property: 'title', textState: null });

      expect(replaced.isFail() && replaced.getError().code).toBe('BLOCK_TEXT_UPDATE_INVALID');
    });
  });

  it('refuses bytes that are not a Yjs update', () => {
    const applied = applyBlockTextUpdate({
      property: 'title',
      textState: null,
      update: new Uint8Array([9, 9, 9, 9, 9]),
    });

    expect(applied.isFail()).toBe(true);
    expect(applied.getError().code).toBe('BLOCK_TEXT_UPDATE_INVALID');
  });

  it('refuses an update that depends on text the block does not have', () => {
    const base = apply(null, insertAbc()).textState;
    const dependent = editFrom(base, (text) => {
      text.insert(3, 'd');
    });

    const applied = applyBlockTextUpdate({ property: 'title', textState: null, update: dependent });

    expect(applied.isFail()).toBe(true);
    expect(applied.getError().code).toBe('BLOCK_TEXT_OUT_OF_SYNC');
  });
});
