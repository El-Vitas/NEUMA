import { describe, expect, it } from 'bun:test';
import { filterRejectedOfPage, readRejectedText } from '@/modules/pages/local-cache/lib/local-cache.rejected.lib';
import type { RejectedTransaction } from '@/modules/pages/local-cache/types/local-cache.types';

const rejected = (overrides: Partial<RejectedTransaction> = {}): RejectedTransaction => ({
  attempts: 0,
  cause: 'forbidden',
  createdAt: 1,
  id: 't1',
  message: 'no permission',
  operations: [],
  ownerId: 'tab-1',
  pageId: 'page-1',
  previews: [],
  rejectedAt: 2,
  spaceId: 'space-1',
  ...overrides,
});

describe('readRejectedText', () => {
  it('joins the words of each part, one after the other', () => {
    const item = rejected({
      previews: [
        { blockId: 'b1', property: 'title', text: 'Primera' },
        { blockId: 'b2', property: 'title', text: 'Segunda' },
      ],
    });

    expect(readRejectedText(item)).toBe('Primera\n\nSegunda');
  });

  it('is empty when the change carried no words', () => {
    expect(readRejectedText(rejected())).toBe('');
  });
});

describe('filterRejectedOfPage', () => {
  it('keeps only the changes of the page, oldest first', () => {
    const list = [
      rejected({ id: 'b', pageId: 'page-1', rejectedAt: 9 }),
      rejected({ id: 'other', pageId: 'page-2' }),
      rejected({ id: 'a', pageId: 'page-1', rejectedAt: 3 }),
    ];

    expect(filterRejectedOfPage(list, 'page-1').map((item) => item.id)).toEqual(['a', 'b']);
  });
});
