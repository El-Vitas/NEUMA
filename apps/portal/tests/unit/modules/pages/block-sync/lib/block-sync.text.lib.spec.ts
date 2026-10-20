import { describe, expect, it } from 'bun:test';
import type { BlockRichText } from '@neuma/shared';
import { applyUpdate, Doc, encodeStateAsUpdate, encodeStateVector } from 'yjs';
import { decodeBase64, encodeBase64 } from '@/modules/pages/block-sync/lib/block-sync.base64.lib';
import {
  editTextToSegments,
  mergeStateVectors,
  readTextSegments,
} from '@/modules/pages/block-sync/lib/block-sync.text.lib';

const plain = (value: string): BlockRichText => (value === '' ? [] : [{ insert: value }]);

const startFrom = (segments: BlockRichText): Doc => {
  const doc = new Doc();
  if (segments.length > 0) doc.getText('title').applyDelta(segments);
  return doc;
};

const exchange = (from: Doc, to: Doc): void => applyUpdate(to, encodeStateAsUpdate(from));

describe('base64', () => {
  it('round-trips bytes, including large ones', () => {
    const bytes = Uint8Array.from({ length: 100_000 }, (_, index) => index % 256);

    expect(decodeBase64(encodeBase64(bytes))).toEqual(bytes);
  });
});

describe('editTextToSegments', () => {
  it('does nothing when the text is the same', () => {
    const doc = startFrom(plain('Hello'));

    expect(editTextToSegments(doc, 'title', plain('Hello'))).toBe(false);
  });

  it('inserts only what was typed', () => {
    const doc = startFrom(plain('Hello'));
    const receiver = new Doc();
    exchange(doc, receiver);
    const before = encodeStateVector(doc);

    editTextToSegments(doc, 'title', plain('Hello world'));

    expect(readTextSegments(doc, 'title')).toEqual(plain('Hello world'));
    applyUpdate(receiver, encodeStateAsUpdate(doc, before));
    expect(readTextSegments(receiver, 'title')).toEqual(plain('Hello world'));
  });

  it('deletes and inserts in the middle', () => {
    const doc = startFrom(plain('Hello brave world'));

    editTextToSegments(doc, 'title', plain('Hello new world'));

    expect(readTextSegments(doc, 'title')).toEqual(plain('Hello new world'));
  });

  it('keeps marks as attributes and applies a mark change', () => {
    const doc = startFrom(plain('Hello world'));
    const bolded: BlockRichText = [{ insert: 'Hello ' }, { attributes: { strong: true }, insert: 'world' }];

    editTextToSegments(doc, 'title', bolded);

    expect(readTextSegments(doc, 'title')).toEqual(bolded);
  });

  it('writes a link as a mark with a value', () => {
    const doc = startFrom([]);
    const linked: BlockRichText = [
      { insert: 'See ' },
      { attributes: { link: 'https://example.com' }, insert: 'this' },
      { insert: '.' },
    ];

    editTextToSegments(doc, 'title', linked);

    expect(readTextSegments(doc, 'title')).toEqual(linked);
  });

  it('inserts an unmarked text next to a marked one without inheriting the mark', () => {
    const doc = startFrom([{ attributes: { strong: true }, insert: 'bold' }]);
    const next: BlockRichText = [{ attributes: { strong: true }, insert: 'bold' }, { insert: ' plain' }];

    editTextToSegments(doc, 'title', next);

    expect(readTextSegments(doc, 'title')).toEqual(next);
  });

  it('writes a mention as an embed that takes one position', () => {
    const doc = startFrom(plain('Ver '));
    const mention = { mention: { label: 'Roadmap', pageId: 'page-target', spaceId: 'space-1' } };
    const next: BlockRichText = [{ insert: 'Ver ' }, { insert: mention }, { insert: ' ahora' }];

    editTextToSegments(doc, 'title', next);

    expect(readTextSegments(doc, 'title')).toEqual(next);
  });

  it('never splits a surrogate pair when one emoji replaces another', () => {
    const doc = startFrom(plain('hi \u{1F600}'));

    editTextToSegments(doc, 'title', plain('hi \u{1F601}'));

    const receiver = new Doc();
    exchange(doc, receiver);
    expect(readTextSegments(receiver, 'title')).toEqual(plain('hi \u{1F601}'));
    expect(JSON.stringify(readTextSegments(receiver, 'title'))).not.toContain('�');
  });

  it('inserts an emoji in front of another one', () => {
    const doc = startFrom(plain('\u{1F600}'));

    editTextToSegments(doc, 'title', plain('\u{1F601}\u{1F600}'));

    const receiver = new Doc();
    exchange(doc, receiver);
    expect(readTextSegments(receiver, 'title')).toEqual(plain('\u{1F601}\u{1F600}'));
  });

  it('converges when two clients edit the same text', () => {
    const origin = startFrom(plain('Hello world'));
    const first = new Doc();
    const second = new Doc();
    exchange(origin, first);
    exchange(origin, second);

    editTextToSegments(first, 'title', plain('Hello brave world'));
    editTextToSegments(second, 'title', plain('Hello world!'));
    exchange(first, second);
    exchange(second, first);

    expect(readTextSegments(first, 'title')).toEqual(readTextSegments(second, 'title'));
    expect(readTextSegments(first, 'title')).toEqual(plain('Hello brave world!'));
  });
});

describe('mergeStateVectors', () => {
  it('keeps the highest clock of each client', () => {
    const merged = mergeStateVectors(
      new Map([
        [1, 5],
        [2, 3],
      ]),
      new Map([
        [1, 2],
        [3, 7],
      ]),
    );

    expect([...merged.entries()].toSorted()).toEqual([
      [1, 5],
      [2, 3],
      [3, 7],
    ]);
  });
});
