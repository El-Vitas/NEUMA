import { describe, expect, test } from 'bun:test';
import { decodeSearchCursor, encodeSearchCursor } from '@/modules/search/utils/search.cursor.utils';

describe('search cursor', () => {
  test('round trips the stable ranking tuple', () => {
    const cursor = { rank: 0.42, sourceId: 'page-2', updatedAt: '2026-08-02T00:00:00.000Z' };

    expect(decodeSearchCursor(encodeSearchCursor(cursor))).toEqual(cursor);
  });

  test('rejects malformed cursors without exposing an exception path', () => {
    expect(decodeSearchCursor('not-a-cursor')).toBeNull();
    expect(decodeSearchCursor(undefined)).toBeNull();
  });
});
