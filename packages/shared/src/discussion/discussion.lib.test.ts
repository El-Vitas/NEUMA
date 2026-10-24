import { describe, expect, it } from 'bun:test';
import type { BlockRichText } from '../block/block-content.types.js';
import { isCommentBodyEmpty, listMentionedUserIds, readCommentExcerpt } from './discussion.lib.js';

const ANA_ID = '0192f3a0-7c1e-7d2a-9b4e-3f5a6b7c8d9e';
const LUIS_ID = '0192f3a0-7c1e-7d2a-9b4e-3f5a6b7c8d9f';

const person = (userId: string, label: string): BlockRichText[number] => ({ insert: { person: { label, userId } } });

describe('listMentionedUserIds', () => {
  it('lists each person once, in the order they were first mentioned', () => {
    const body: BlockRichText = [
      { insert: 'hola ' },
      person(LUIS_ID, 'Luis'),
      { insert: ' y ' },
      person(ANA_ID, 'Ana'),
      person(LUIS_ID, 'Luis'),
    ];

    expect(listMentionedUserIds(body)).toEqual([LUIS_ID, ANA_ID]);
  });

  it('ignores every other kind of embed', () => {
    const body: BlockRichText = [{ insert: { hard_break: true } }, { insert: 'texto' }];

    expect(listMentionedUserIds(body)).toEqual([]);
  });
});

describe('isCommentBodyEmpty', () => {
  it('is empty without segments and with only blanks', () => {
    expect(isCommentBodyEmpty([])).toBe(true);
    expect(isCommentBodyEmpty([{ insert: '   ' }])).toBe(true);
  });

  it('is not empty when it holds text or a mention', () => {
    expect(isCommentBodyEmpty([{ insert: 'hola' }])).toBe(false);
    expect(isCommentBodyEmpty([person(ANA_ID, 'Ana')])).toBe(false);
  });
});

describe('readCommentExcerpt', () => {
  it('reads a mention as its label', () => {
    expect(readCommentExcerpt([{ insert: 'mira ' }, person(ANA_ID, 'Ana')], 100)).toBe('mira Ana');
  });

  it('cuts long text and says so', () => {
    expect(readCommentExcerpt([{ insert: 'abcdefghij' }], 5)).toBe('abcde…');
  });
});
