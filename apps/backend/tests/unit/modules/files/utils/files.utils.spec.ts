import { describe, expect, it } from 'bun:test';
import { readRequestedByteRange } from '../../../../../src/modules/files/utils/files.utils';

describe('readRequestedByteRange', () => {
  it('gives the whole file when none was asked for', () => {
    expect(readRequestedByteRange(undefined, 1000)).toEqual({ kind: 'whole' });
    expect(readRequestedByteRange('', 1000)).toEqual({ kind: 'whole' });
  });

  it('gives the stretch that was asked for', () => {
    expect(readRequestedByteRange('bytes=100-199', 1000)).toEqual({ end: 199, kind: 'part', start: 100 });
  });

  /** A player asking for «from here on» is asking for the rest, however long it turns out to be. */
  it('reads an open end as the rest of the file', () => {
    expect(readRequestedByteRange('bytes=100-', 1000)).toEqual({ end: 999, kind: 'part', start: 100 });
  });

  it('reads a bare count as the last bytes of the file', () => {
    expect(readRequestedByteRange('bytes=-300', 1000)).toEqual({ end: 999, kind: 'part', start: 700 });
    expect(readRequestedByteRange('bytes=-4000', 1000)).toEqual({ end: 999, kind: 'part', start: 0 });
  });

  it('stops at the end of the file when more was asked for', () => {
    expect(readRequestedByteRange('bytes=900-5000', 1000)).toEqual({ end: 999, kind: 'part', start: 900 });
  });

  /** Asking for what is not there is not the same as asking for everything, and is not answered with it. */
  it('refuses a stretch that begins past the end, or that runs backwards', () => {
    expect(readRequestedByteRange('bytes=1000-1200', 1000)).toEqual({ kind: 'unsatisfiable' });
    expect(readRequestedByteRange('bytes=500-400', 1000)).toEqual({ kind: 'unsatisfiable' });
    expect(readRequestedByteRange('bytes=0-0', 0)).toEqual({ kind: 'unsatisfiable' });
  });

  it('ignores what is not a stretch of bytes at all', () => {
    expect(readRequestedByteRange('items=0-10', 1000)).toEqual({ kind: 'whole' });
    expect(readRequestedByteRange('bytes=abc', 1000)).toEqual({ kind: 'whole' });
    expect(readRequestedByteRange('bytes=0-10, 20-30', 1000)).toEqual({ kind: 'whole' });
  });
});
