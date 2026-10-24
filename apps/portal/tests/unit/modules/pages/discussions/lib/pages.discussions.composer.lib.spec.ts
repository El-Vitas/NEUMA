import { describe, expect, it } from 'bun:test';
import {
  answerDiscussionKey,
  buildCommentBody,
  filterPersonOptions,
  findMentionQuery,
  insertMention,
  readCommentDraft,
} from '@/modules/pages/discussions/lib/pages.discussions.composer.lib';

const ANA = { email: 'ana@x.cl', id: '0192f3a0-7c1e-7d2a-9b4e-3f5a6b7c8d9e', name: 'Ana Pérez' };
const LUIS = { email: 'luis@x.cl', id: '0192f3a0-7c1e-7d2a-9b4e-3f5a6b7c8d9f', name: 'Luis Soto' };

describe('findMentionQuery', () => {
  it('finds the word being written after an @', () => {
    expect(findMentionQuery('Hola @An', 8)).toEqual({ query: 'An', start: 5 });
  });

  it('finds an @ that opens the text', () => {
    expect(findMentionQuery('@', 1)).toEqual({ query: '', start: 0 });
  });

  it('ignores an @ in the middle of a word, like an email', () => {
    expect(findMentionQuery('ana@x', 5)).toBeNull();
  });

  it('stops looking once a space has been typed after the @', () => {
    expect(findMentionQuery('Hola @Ana Pé', 12)).toBeNull();
  });

  it('only looks before the cursor', () => {
    expect(findMentionQuery('Hola @An más', 8)).toEqual({ query: 'An', start: 5 });
  });
});

describe('filterPersonOptions', () => {
  it('matches on any part of the name, ignoring case and accents', () => {
    expect(filterPersonOptions([ANA, LUIS], 'perez', 6).map((option) => option.id)).toEqual([ANA.id]);
    expect(filterPersonOptions([ANA, LUIS], 'SO', 6).map((option) => option.id)).toEqual([LUIS.id]);
  });

  it('lists everyone, up to the limit, when nothing was typed yet', () => {
    expect(filterPersonOptions([ANA, LUIS], '', 1)).toHaveLength(1);
  });

  it('matches on the email too', () => {
    expect(filterPersonOptions([ANA, LUIS], 'luis@', 6).map((option) => option.id)).toEqual([LUIS.id]);
  });
});

describe('insertMention', () => {
  it('replaces what was typed after the @ with the name and leaves the cursor after it', () => {
    const result = insertMention({ mentions: [], text: 'Hola @An más' }, { query: 'An', start: 5 }, ANA);

    expect(result.draft.text).toBe('Hola @Ana Pérez  más');
    expect(result.caret).toBe('Hola @Ana Pérez '.length);
    expect(result.draft.mentions).toEqual([{ label: 'Ana Pérez', userId: ANA.id }]);
  });
});

describe('buildCommentBody', () => {
  it('writes a person where the name stands and keeps the words around it', () => {
    const body = buildCommentBody({
      mentions: [{ label: 'Ana Pérez', userId: ANA.id }],
      text: 'Hola @Ana Pérez, mira esto',
    });

    expect(body).toEqual([
      { insert: 'Hola ' },
      { insert: { person: { label: 'Ana Pérez', userId: ANA.id } } },
      { insert: ', mira esto' },
    ]);
  });

  it('drops a mention whose name was erased from the text', () => {
    const body = buildCommentBody({ mentions: [{ label: 'Ana Pérez', userId: ANA.id }], text: 'Hola' });

    expect(body).toEqual([{ insert: 'Hola' }]);
  });

  it('keeps several mentions in the order they stand in the text', () => {
    const body = buildCommentBody({
      mentions: [
        { label: 'Luis Soto', userId: LUIS.id },
        { label: 'Ana Pérez', userId: ANA.id },
      ],
      text: '@Ana Pérez y @Luis Soto',
    });

    expect(body.flatMap((segment) => (typeof segment.insert === 'string' ? [] : [segment.insert]))).toEqual([
      { person: { label: 'Ana Pérez', userId: ANA.id } },
      { person: { label: 'Luis Soto', userId: LUIS.id } },
    ]);
  });

  it('is empty for blank text', () => {
    expect(buildCommentBody({ mentions: [], text: '   ' })).toEqual([]);
  });

  it('trims the ends of the text', () => {
    expect(buildCommentBody({ mentions: [], text: '  Hola \n' })).toEqual([{ insert: 'Hola' }]);
  });
});

describe('answerDiscussionKey', () => {
  const press = (key: string, modifiers: { ctrlKey?: boolean; metaKey?: boolean } = {}) => ({
    ctrlKey: modifiers.ctrlKey ?? false,
    key,
    metaKey: modifiers.metaKey ?? false,
  });
  const open = { isListOpen: true, optionsCount: 3, selectedIndex: 0 };
  const closed = { isListOpen: false, optionsCount: 0, selectedIndex: 0 };

  it('moves through the open list and wraps around at both ends', () => {
    expect(answerDiscussionKey(press('ArrowDown'), open)).toEqual({ index: 1, kind: 'move' });
    expect(answerDiscussionKey(press('ArrowUp'), open)).toEqual({ index: 2, kind: 'move' });
    expect(answerDiscussionKey(press('ArrowDown'), { ...open, selectedIndex: 2 })).toEqual({ index: 0, kind: 'move' });
  });

  it('picks the person under the cursor with Enter or Tab, and closes the list with Escape', () => {
    expect(answerDiscussionKey(press('Enter'), open)).toEqual({ kind: 'choose' });
    expect(answerDiscussionKey(press('Tab'), open)).toEqual({ kind: 'choose' });
    expect(answerDiscussionKey(press('Escape'), open)).toEqual({ kind: 'close' });
  });

  it('leaves Enter alone when the list has nobody to pick', () => {
    expect(answerDiscussionKey(press('Enter'), { ...open, optionsCount: 0 })).toEqual({ kind: 'none' });
  });

  it('sends with Ctrl or Cmd + Enter whether or not the list is open', () => {
    expect(answerDiscussionKey(press('Enter', { ctrlKey: true }), closed)).toEqual({ kind: 'submit' });
    expect(answerDiscussionKey(press('Enter', { metaKey: true }), closed)).toEqual({ kind: 'submit' });
  });

  it('does nothing with an ordinary key', () => {
    expect(answerDiscussionKey(press('a'), closed)).toEqual({ kind: 'none' });
    expect(answerDiscussionKey(press('Enter'), closed)).toEqual({ kind: 'none' });
  });
});

describe('readCommentDraft', () => {
  it('turns a stored comment back into text and the people it names, so it can be edited', () => {
    const draft = readCommentDraft([
      { insert: 'Hola ' },
      { insert: { person: { label: 'Ana Pérez', userId: ANA.id } } },
      { insert: ' ok' },
    ]);

    expect(draft).toEqual({ mentions: [{ label: 'Ana Pérez', userId: ANA.id }], text: 'Hola @Ana Pérez ok' });
  });
});
