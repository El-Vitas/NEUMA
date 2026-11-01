import { describe, expect, test } from 'bun:test';
import { decodeSearchCursor, encodeSearchCursor } from '@/modules/search/utils/search.cursor.utils';

describe('search cursor', () => {
  test('round trips the stable ranking tuple', () => {
    const cursor = { id: 'block-2', matching: 'words' as const, rank: 0.42 };

    expect(decodeSearchCursor(encodeSearchCursor(cursor))).toEqual(cursor);
  });

  test('keeps the mode of matching, so a next page never mixes words with typos', () => {
    const cursor = { id: 'block-2', matching: 'typo' as const, rank: 0.5 };

    expect(decodeSearchCursor(encodeSearchCursor(cursor))?.matching).toBe('typo');
  });

  test('rejects malformed cursors without exposing an exception path', () => {
    expect(decodeSearchCursor('not-a-cursor')).toBeNull();
    expect(decodeSearchCursor(undefined)).toBeNull();
  });

  test('rejects a cursor from before the matching mode existed', () => {
    const old = Buffer.from(
      JSON.stringify({ rank: 0.4, sourceId: 'page-2', updatedAt: '2026-08-02T00:00:00.000Z' }),
      'utf8',
    ).toString('base64url');

    expect(decodeSearchCursor(old)).toBeNull();
  });
});
