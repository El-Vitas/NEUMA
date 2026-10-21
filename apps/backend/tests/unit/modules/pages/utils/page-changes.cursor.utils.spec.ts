import { describe, expect, it } from 'bun:test';
import { decodeChangesCursor, encodeChangesCursor } from '@/modules/pages/utils/page-changes.cursor.utils';

describe('changes cursor', () => {
  it('keeps the transaction id a reader reached', () => {
    const encoded = encodeChangesCursor({ after: null, fresh: null, since: '709596' });

    expect(decodeChangesCursor(encoded)).toEqual({ after: null, fresh: null, since: '709596' });
  });

  it('keeps the position inside a page of changes and the watermark of the first page', () => {
    const cursor = { after: { id: 'row-7', xid: '709600' }, fresh: '709590', since: '709500' };

    expect(decodeChangesCursor(encodeChangesCursor(cursor))).toEqual(cursor);
  });

  it('is opaque text that is safe in a URL', () => {
    expect(encodeChangesCursor({ after: null, fresh: null, since: '1' })).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('reads a value that was not written by the server as no cursor', () => {
    expect(decodeChangesCursor('not-a-cursor')).toBeNull();
    expect(decodeChangesCursor(Buffer.from('{"s":"12ab"}').toString('base64url'))).toBeNull();
    expect(decodeChangesCursor(Buffer.from('{"s":"-5"}').toString('base64url'))).toBeNull();
    expect(decodeChangesCursor('')).toBeNull();
  });
});
