import { describe, expect, it } from 'bun:test';
import { PAGE_CONTENT_SCHEMA_VERSION, USER_ROLE } from '@company-brain/shared';
import { PAGE_CONTENT_STORE_OUTCOME } from '@/modules/pages/constants/pages.constants';
import { PageMaintenanceService } from '@/modules/pages/page.maintenance.service';
import type { PageContentStoreOutcome, PageLiveDocument } from '@/modules/pages/types/page.types';
import type {
  PageCollaborativeContentStore,
  PageMaintenanceRepositoryContract,
  PageMaintenanceRow,
} from '@/modules/pages/types/page-maintenance.types';

const admin = { role: USER_ROLE.ADMIN, userId: 'user-admin', workspaceId: 'workspace-a' };
const worker = { role: USER_ROLE.WORKER, userId: 'user-a', workspaceId: 'workspace-a' };

const storedPage = (id: string): PageMaintenanceRow => ({
  content: {
    content: [{ content: [{ text: 'Example', type: 'text' }], type: 'paragraph' }],
    schemaVersion: PAGE_CONTENT_SCHEMA_VERSION,
    type: 'doc',
  },
  id,
});

const liveDocument: PageLiveDocument = {
  readLoadedPageContent: () => null,
  writePageContent: () => Promise.reject(new Error('Maintenance never writes through the live document')),
};

const createRepository = (pages: readonly PageMaintenanceRow[]) => {
  const reindexed: string[] = [];
  const repository: PageMaintenanceRepositoryContract = {
    announceReindex: (pageIds) => {
      reindexed.push(...pageIds);
      return Promise.resolve();
    },
    listActivePages: (_workspaceId, afterPageId) => Promise.resolve(afterPageId === null ? pages : []),
  };
  return { reindexed, repository };
};

const storeAnswering = (outcome: (pageId: string) => PageContentStoreOutcome): PageCollaborativeContentStore => ({
  storeCollaborativeContent: (pageId) => Promise.resolve(outcome(pageId)),
});

describe('page maintenance — fillPageBlocks', () => {
  it('is run only by whoever runs the workspace', async () => {
    const { repository } = createRepository([]);
    const service = new PageMaintenanceService(
      storeAnswering(() => PAGE_CONTENT_STORE_OUTCOME.unchanged),
      repository,
      liveDocument,
    );

    expect((await service.fillPageBlocks(worker)).getError().code).toBe('PAGE_MAINTENANCE_ADMIN_ONLY');
  });

  it('gives ids to the pages that lacked them and asks the others to be projected again', async () => {
    const { reindexed, repository } = createRepository([storedPage('page-a'), storedPage('page-b')]);
    const service = new PageMaintenanceService(
      storeAnswering((pageId) =>
        pageId === 'page-a' ? PAGE_CONTENT_STORE_OUTCOME.stored : PAGE_CONTENT_STORE_OUTCOME.unchanged,
      ),
      repository,
      liveDocument,
    );

    const outcome = await service.fillPageBlocks(admin);

    expect(outcome.getValue()).toEqual({ pagesGivenIds: 1, pagesReindexed: 1, unreadablePages: 0 });
    expect(reindexed).toEqual(['page-b']);
  });

  it('leaves alone a page stored in a shape it cannot read, and counts it', async () => {
    const { repository } = createRepository([{ content: { type: 'doc' }, id: 'page-a' }]);
    const service = new PageMaintenanceService(
      storeAnswering(() => PAGE_CONTENT_STORE_OUTCOME.stored),
      repository,
      liveDocument,
    );

    expect((await service.fillPageBlocks(admin)).getValue().unreadablePages).toBe(1);
  });

  it('refuses a second run in the same workspace while the first is going, and lets one in once it ends', async () => {
    const { repository } = createRepository([storedPage('page-a')]);
    const { promise: firstWrite, resolve: finishFirstWrite } = Promise.withResolvers<PageContentStoreOutcome>();
    const writes: Promise<PageContentStoreOutcome>[] = [firstWrite];
    const service = new PageMaintenanceService(
      { storeCollaborativeContent: () => writes.shift() ?? Promise.resolve(PAGE_CONTENT_STORE_OUTCOME.stored) },
      repository,
      liveDocument,
    );

    const first = service.fillPageBlocks(admin);
    const second = await service.fillPageBlocks(admin);
    finishFirstWrite(PAGE_CONTENT_STORE_OUTCOME.stored);
    const firstOutcome = await first;
    const third = await service.fillPageBlocks(admin);

    expect(second.getError().code).toBe('PAGE_MAINTENANCE_ALREADY_RUNNING');
    expect(firstOutcome.isOk()).toBe(true);
    expect(third.isOk()).toBe(true);
  });
});
