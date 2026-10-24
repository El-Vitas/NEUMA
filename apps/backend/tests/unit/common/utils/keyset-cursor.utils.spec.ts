import { describe, expect, it } from 'bun:test';
import { decodeKeysetCursor, encodeKeysetCursor } from '@/common/utils/keyset-cursor.utils';

describe('keyset cursor', () => {
  it('returns the position it was made from', () => {
    const position = { at: new Date('2026-10-20T15:30:00.000Z'), id: 'abc-123' };

    expect(decodeKeysetCursor(encodeKeysetCursor(position))).toEqual(position);
  });

  it('reads a missing or forged cursor as the start of the list', () => {
    expect(decodeKeysetCursor(undefined)).toBeNull();
    expect(decodeKeysetCursor('')).toBeNull();
    expect(decodeKeysetCursor('no-es-un-cursor')).toBeNull();
    expect(decodeKeysetCursor(Buffer.from('fecha|id', 'utf8').toString('base64url'))).toBeNull();
  });
});
