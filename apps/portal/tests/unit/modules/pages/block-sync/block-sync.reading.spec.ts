import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readingPath = resolve(
  import.meta.dir,
  '../../../../../modules/pages/block-sync/server/lib/block-sync.reading.server.ts',
);

describe('the first read of the blocks of a page', () => {
  it('is never kept in a cache: a page being written must open with what was written a moment ago', () => {
    const source = readFileSync(readingPath, 'utf8');

    expect(source).not.toContain('use cache');
    expect(source).not.toContain('cacheLife');
    expect(source).not.toContain('cacheTag');
  });

  it('is read once per request at most', () => {
    expect(readFileSync(readingPath, 'utf8')).toContain("from 'react'");
  });
});
