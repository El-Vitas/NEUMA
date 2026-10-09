import { describe, expect, it } from 'bun:test';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { USER_ROLE } from '@neuma/shared';
import { Logger } from 'nestjs-pino';
import { PAGE_VIEW_REPOSITORY } from '@/modules/page-views/constants/page-views.constants';
import { PageViewsService } from '@/modules/page-views/page-views.service';
import type { PageViewEntry, PageViewRepositoryContract } from '@/modules/page-views/types/page-view.types';

const viewer: PageViewEntry = { id: 'user-a', name: 'User A', viewedAt: new Date('2026-08-20T10:00:00Z') };

const createRepository = (overrides: Partial<PageViewRepositoryContract> = {}): PageViewRepositoryContract => ({
  countViews: () => Promise.resolve(0),
  createView: () => Promise.resolve(undefined),
  findAccessiblePageId: () => Promise.resolve('page-a'),
  findLastViewedAt: () => Promise.resolve(null),
  getPageViewsEnabled: () => Promise.resolve(true),
  listViews: () => Promise.resolve([]),
  setPageViewsEnabled: (_workspaceId, enabled) => Promise.resolve(enabled),
  ...overrides,
});

const buildTestingModule = async (
  repository: PageViewRepositoryContract,
  fakeLogger: { error: (context: Record<string, unknown>, message: string) => void } = { error: () => undefined },
): Promise<TestingModule> =>
  Test.createTestingModule({
    providers: [
      { provide: PAGE_VIEW_REPOSITORY, useValue: repository },
      { provide: Logger, useValue: fakeLogger },
      PageViewsService,
    ],
  }).compile();

describe('page views service — getSettings / updateSettings', () => {
  it('refuses a non-admin caller', async () => {
    const moduleRef = await buildTestingModule(createRepository());
    const service = moduleRef.get(PageViewsService);

    const result = await service.getSettings('workspace-a', USER_ROLE.WORKER);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_VIEWS_ACCESS_DENIED');
  });

  it('lets an admin read and change the toggle', async () => {
    let storedEnabled = true;
    const repository = createRepository({
      getPageViewsEnabled: () => Promise.resolve(storedEnabled),
      setPageViewsEnabled: (_workspaceId, enabled) => {
        storedEnabled = enabled;
        return Promise.resolve(enabled);
      },
    });
    const moduleRef = await buildTestingModule(repository);
    const service = moduleRef.get(PageViewsService);

    const updated = await service.updateSettings('workspace-a', USER_ROLE.ADMIN, false);
    const read = await service.getSettings('workspace-a', USER_ROLE.ADMIN);

    expect(updated.isOk() && updated.getValue().enabled).toBe(false);
    expect(read.isOk() && read.getValue().enabled).toBe(false);
  });
});

describe('page views service — getUsageSummary', () => {
  it('refuses a non-admin caller even when the page is accessible to them', async () => {
    const moduleRef = await buildTestingModule(createRepository());
    const service = moduleRef.get(PageViewsService);

    const result = await service.getUsageSummary('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_VIEWS_ACCESS_DENIED');
  });

  it('reports the view count and viewers for an admin', async () => {
    const repository = createRepository({
      countViews: () => Promise.resolve(3),
      listViews: () => Promise.resolve([viewer]),
    });
    const moduleRef = await buildTestingModule(repository);
    const service = moduleRef.get(PageViewsService);

    const result = await service.getUsageSummary('page-a', 'workspace-a', 'admin-a', USER_ROLE.ADMIN);

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toEqual({ viewCount: 3, viewers: [viewer] });
  });

  it('reports the page as not accessible when the admin cannot reach it', async () => {
    const repository = createRepository({ findAccessiblePageId: () => Promise.resolve(null) });
    const moduleRef = await buildTestingModule(repository);
    const service = moduleRef.get(PageViewsService);

    const result = await service.getUsageSummary('page-a', 'workspace-a', 'admin-a', USER_ROLE.ADMIN);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_VIEWS_PAGE_NOT_ACCESSIBLE');
  });
});

describe('page views service — recordView', () => {
  it('records a first view when tracking is enabled and the page is accessible', async () => {
    const createdViews: string[] = [];
    const repository = createRepository({
      createView: (pageId) => {
        createdViews.push(pageId);
        return Promise.resolve(undefined);
      },
    });
    const moduleRef = await buildTestingModule(repository);
    const service = moduleRef.get(PageViewsService);

    await service.recordView('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(createdViews).toEqual(['page-a']);
  });

  it('does not record anything when tracking is disabled for the workspace', async () => {
    const createdViews: string[] = [];
    const repository = createRepository({
      createView: (pageId) => {
        createdViews.push(pageId);
        return Promise.resolve(undefined);
      },
      getPageViewsEnabled: () => Promise.resolve(false),
    });
    const moduleRef = await buildTestingModule(repository);
    const service = moduleRef.get(PageViewsService);

    await service.recordView('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(createdViews).toEqual([]);
  });

  it('does not record a view for a page the caller cannot access', async () => {
    const createdViews: string[] = [];
    const repository = createRepository({
      createView: (pageId) => {
        createdViews.push(pageId);
        return Promise.resolve(undefined);
      },
      findAccessiblePageId: () => Promise.resolve(null),
    });
    const moduleRef = await buildTestingModule(repository);
    const service = moduleRef.get(PageViewsService);

    await service.recordView('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(createdViews).toEqual([]);
  });

  it('skips a second view from the same reader inside the cooldown window', async () => {
    const createdViews: string[] = [];
    const repository = createRepository({
      createView: (pageId) => {
        createdViews.push(pageId);
        return Promise.resolve(undefined);
      },
      findLastViewedAt: () => Promise.resolve(new Date()),
    });
    const moduleRef = await buildTestingModule(repository);
    const service = moduleRef.get(PageViewsService);

    await service.recordView('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(createdViews).toEqual([]);
  });

  it('never throws when the repository fails, and logs the failure instead', async () => {
    const loggedErrors: Array<{ context: Record<string, unknown>; message: string }> = [];
    const repository = createRepository({
      createView: () => Promise.reject(new Error('database connection lost')),
    });
    const moduleRef = await buildTestingModule(repository, {
      error: (context, message) => {
        loggedErrors.push({ context, message });
      },
    });
    const service = moduleRef.get(PageViewsService);

    await service.recordView('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(loggedErrors).toHaveLength(1);
    expect(loggedErrors[0]?.message).toBe('Failed to record page view');
  });
});
