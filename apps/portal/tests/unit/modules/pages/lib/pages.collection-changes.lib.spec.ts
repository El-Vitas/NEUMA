import { describe, expect, it } from 'bun:test';
import { createChangesController } from '@/modules/pages/collections/lib/pages.collection-changes.lib';
import type { PageCollectionChanges } from '@/modules/pages/collections/types/pages.query.types';

const emptyRead: PageCollectionChanges = {
  attachedFiles: [],
  relatedRows: [],
  cursor: 'cursor-2',
  hasMore: false,
  isReset: false,
  possiblyChanged: [],
  possiblyChangedIsTruncated: false,
  rows: [],
  total: 0,
  trashedIds: [],
};

describe('createChangesController', () => {
  it('asks for the view again, and keeps following, when applying a batch throws', async () => {
    const refreshes: string[] = [];
    let applications = 0;
    const controller = createChangesController<'apply-failed'>({
      apply: async () => {
        applications += 1;
        if (applications === 1) throw new Error('malformed row');
        return null;
      },
      coalesceMs: 0,
      initialCursor: 'cursor-1',
      onLookups: () => undefined,
      readChanges: async () => emptyRead,
      requestRefresh: (reason) => refreshes.push(reason),
    });

    controller.notify([{ id: 'row-1', version: 2 }]);
    await controller.flush();
    await new Promise((resolve) => setTimeout(resolve, 5));
    controller.notify([{ id: 'row-2', version: 3 }]);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await controller.flush();

    expect(refreshes).toEqual(['changes-failed']);
    expect(applications).toBe(2);
  });
});
