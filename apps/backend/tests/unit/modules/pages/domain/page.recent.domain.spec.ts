import { describe, expect, it } from 'bun:test';
import { foldRecentEdits } from '@/modules/pages/domain/page.recent.domain';

const at = (minute: number): Date => new Date(Date.UTC(2026, 0, 1, 0, minute));

describe('foldRecentEdits', () => {
  it('gives each page the time and the author of its newest edit, the newest page first', () => {
    const folded = foldRecentEdits([
      { blockId: 'a1', editedAt: at(5), editedById: 'ana', pageId: 'page-a' },
      { blockId: 'a2', editedAt: at(9), editedById: 'beto', pageId: 'page-a' },
      { blockId: 'b1', editedAt: at(12), editedById: 'ana', pageId: 'page-b' },
    ]);

    expect(folded).toEqual([
      { editedAt: at(12), editedById: 'ana', id: 'page-b' },
      { editedAt: at(9), editedById: 'beto', id: 'page-a' },
    ]);
  });

  it('answers nothing when there are no edits', () => {
    expect(foldRecentEdits([])).toEqual([]);
  });
});
