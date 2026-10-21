import { describe, expect, it } from 'bun:test';
import { DatabasePropertyType, type JsonObject, type JsonValue, PageLifecycle } from '@neuma/db';
import {
  DEFAULT_PAGE_PROPERTY_CONFIG,
  type PageContent,
  pageContentSchema,
  Result,
  USER_ROLE,
  type UserRole,
} from '@neuma/shared';
import type { SchemaPropertyDefinition, SchemaPropertyValues } from '@/common/domain/schema.domain.types';
import type { IStorageProvider } from '@/common/types/storage.types';
import { REDACTED_MENTION_LABEL } from '@/modules/pages/constants/pages.constants';
import { PagesService } from '@/modules/pages/pages.service';
import type {
  PageAttachmentsCleanupRepositoryContract,
  PageContentWriter,
  PageLogger,
  PagePurgeRepositoryContract,
  PageRepositoryContract,
  PageVersionRetentionRepositoryContract,
  UpdatePagePropertyValuesInput,
} from '@/modules/pages/types/page.types';
import type { PageSchemaRepositoryContract } from '@/modules/pages/types/page-schema.types';

const validPageContent: PageContent = {
  content: [{ content: [{ text: 'Example', type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
};

const page = {
  content: {},
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  createdBy: null,
  hasOwnPermissions: false,
  id: 'page-a',
  lifecycle: PageLifecycle.ACTIVE,
  lockedAt: null,
  order: 0,
  owner: null,
  parentId: null,
  propertyValues: null,
  spaceId: 'space-a',
  title: 'Page A',
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedBy: null,
  verificationExpiresAt: null,
  verifiedAt: null,
  verifiedBy: null,
  version: 1,
};

const contentWriter: PageContentWriter = {
  pageId: 'page-a',
  role: USER_ROLE.WORKER,
  spaceId: 'space-a',
  userId: 'user-a',
  workspaceId: 'workspace-a',
};

const createRepository = (): PageRepositoryContract => ({
  countDescendantsByLifecycle: () => Promise.resolve(0),
  create: () => Promise.resolve(page),
  deleteForever: () => Promise.resolve('SCHEDULED'),
  duplicate: () => Promise.resolve(page),
  emptyTrash: () => Promise.resolve([]),
  findReadablePageIds: (pageIds) => Promise.resolve(pageIds),
  getAccessible: () => Promise.resolve(page),
  findMoveContext: () =>
    Promise.resolve({
      pageId: 'page-a',
      pages: [
        { id: 'page-a', parentId: null, spaceId: 'space-a' },
        { id: 'page-b', parentId: null, spaceId: 'space-a' },
      ],
      propertyValues: null,
      spaceId: 'space-a',
      title: 'Page A',
    }),
  listMoveDestinations: () => Promise.resolve({ pages: [], spaces: [] }),
  listTrashed: () => Promise.resolve([]),
  listWithProperties: () => Promise.resolve([]),
  move: () => Promise.resolve(page),
  parentBelongsToSpace: () => Promise.resolve(true),
  listAccessible: () => Promise.resolve([page]),
  restoreCascade: () =>
    Promise.resolve({ parentTitle: null, restoredChildCount: 0, restoredToRoot: false, spaceName: null }),
  trashCascade: () => Promise.resolve(true),
  findVersion: () => Promise.resolve(null),
  listVersions: () => Promise.resolve({ items: [], nextCursor: null }),
  recordVersion: () => Promise.resolve(),
  restoreVersion: () => Promise.resolve(null),
  writeContent: () => Promise.resolve(null),
  updatePropertyValues: (_input, merge) => {
    const merged = merge(null);
    return Promise.resolve(merged.isOk() ? Result.ok(page) : Result.fail(merged.getError()));
  },
  rename: () => Promise.resolve(page),
  reorderAmongSiblings: () => Promise.resolve([page]),
  setLocked: () => Promise.resolve(page),
  readRowTemplate: () => Promise.resolve(null),
  setDefaultTemplate: () => Promise.resolve(page),
  setOwner: () => Promise.resolve(page),
  setVerification: () => Promise.resolve(page),
  updateCover: () => Promise.resolve(page),
  updateIcon: () => Promise.resolve(page),
});

const createSchemaRepository = (): PageSchemaRepositoryContract => ({
  attachFilesToPage: () => Promise.resolve(),
  defineSchema: (pageId, shape) => Promise.resolve({ pageId, ...shape }),
  findAttachableFileIds: () => Promise.resolve(new Set<string>()),
  findCollectionIds: () => Promise.resolve(new Set<string>()),
  getSchema: (pageId) => Promise.resolve({ pageId, properties: [], views: [] }),
  rewriteOption: (pageId, _propertyKey, _change, properties) => Promise.resolve({ pageId, properties, views: [] }),
  listPersonPropertyKeys: () => Promise.resolve(new Map()),
  resolveSchemaProperties: () => Promise.resolve([]),
  listWorkspaceMemberIds: () => Promise.resolve([]),
  readRowsById: () => Promise.resolve({ attachedFiles: [], hasMore: false, relatedRows: [], rows: [] }),
});

const createAttachmentsCleanupRepository = (): PageAttachmentsCleanupRepositoryContract => ({
  deleteForPages: () => Promise.resolve(),
  listAssetsForPages: () => Promise.resolve([]),
  listStorageKeysForPages: () => Promise.resolve([]),
});

const createStorageProvider = (): IStorageProvider => ({
  delete: () => Promise.resolve(),
  read: () => Promise.resolve(Buffer.from('')),
  save: () => Promise.resolve('storage-key'),
});

const createLogger = (): PageLogger => ({ warn: () => undefined });

const createPurgeRepository = (dueBatches: readonly (readonly string[])[] = []): PagePurgeRepositoryContract => {
  const remaining = [...dueBatches];
  return { purgeDue: () => Promise.resolve(remaining.shift() ?? []) };
};

const createVersionRetentionRepository = (seenCutoffs: Date[] = []): PageVersionRetentionRepositoryContract => ({
  thin: (olderThan: Date) => {
    seenCutoffs.push(olderThan);
    return Promise.resolve(0);
  },
});

describe('pages service', () => {
  it('lets an editor write content in a page they can open', async () => {
    const service = new PagesService(
      createRepository(),
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );
    const result = await service.authorizeContentWrite(contentWriter, validPageContent);

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toEqual(validPageContent);
  });

  it('refuses content from someone who may only read', async () => {
    const service = new PagesService(
      createRepository(),
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );
    const result = await service.authorizeContentWrite({ ...contentWriter, role: USER_ROLE.CLIENT }, validPageContent);

    expect(result.getError().code).toBe('PAGE_ACCESS_DENIED');
  });

  it('refuses a page reached through the address of another space', async () => {
    const service = new PagesService(
      createRepository(),
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );
    const result = await service.authorizeContentWrite({ ...contentWriter, spaceId: 'space-b' }, validPageContent);

    expect(result.getError().code).toBe('PAGE_ACCESS_DENIED');
  });

  const invalidPageContents: { content: JsonObject; name: string }[] = [
    {
      content: { content: [{ attrs: { level: 9 }, content: [], type: 'heading' }], schemaVersion: 1, type: 'doc' },
      name: 'a block it knows, malformed',
    },
    {
      content: {
        content: [{ content: [{ marks: [{ type: 'unknown' }], text: 'Example', type: 'text' }], type: 'paragraph' }],
        schemaVersion: 1,
        type: 'doc',
      },
      name: 'an unknown mark type',
    },
    {
      content: {
        content: [
          { content: [{ content: [{ text: 'Example', type: 'text' }], type: 'paragraph' }], type: 'bullet_list' },
        ],
        schemaVersion: 1,
        type: 'doc',
      },
      name: 'invalid node nesting',
    },
    {
      content: {
        content: [{ content: [{ text: 'Example', type: 'text' }], type: 'paragraph' }],
        schemaVersion: 2,
        type: 'doc',
      },
      name: 'an unsupported schema version',
    },
  ];

  it.each(invalidPageContents)('refuses content with $name before anything is written', async ({ content }) => {
    const service = new PagesService(
      createRepository(),
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.authorizeContentWrite(contentWriter, content);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_CONTENT_INVALID');
  });

  it('rejects invalid create content before repository mutation', async () => {
    let createCalls = 0;
    const repository = {
      ...createRepository(),
      create: () => {
        createCalls += 1;
        return Promise.resolve(page);
      },
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.create(
      {
        content: { content: [], schemaVersion: 1, type: 'doc' },
        createdById: 'user-a',
        parentId: null,
        propertyValues: null,
        role: USER_ROLE.WORKER,
        spaceId: 'space-a',
        title: 'Page A',
        userId: 'user-a',
        workspaceId: 'workspace-a',
      },
      USER_ROLE.WORKER,
    );

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_CONTENT_INVALID');
    expect(createCalls).toBe(0);
  });

  it('forwards valid create content to the repository', async () => {
    let receivedContent: JsonValue | PageContent | undefined;
    const repository = {
      ...createRepository(),
      create: (input: Parameters<PageRepositoryContract['create']>[0]) => {
        receivedContent = input.content;
        return Promise.resolve(page);
      },
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.create(
      {
        content: validPageContent,
        createdById: 'user-a',
        parentId: null,
        propertyValues: null,
        role: USER_ROLE.WORKER,
        spaceId: 'space-a',
        title: 'Page A',
        userId: 'user-a',
        workspaceId: 'workspace-a',
      },
      USER_ROLE.WORKER,
    );

    expect(result.isOk()).toBe(true);
    const received = pageContentSchema.parse(receivedContent);
    expect(received.content).toHaveLength(validPageContent.content.length);
    expect(received.content[0]).toMatchObject({ content: [{ text: 'Example', type: 'text' }], type: 'paragraph' });
    expect(typeof received.content[0]?.attrs?.id).toBe('string');
  });

  it('defaults page listing to active pages and forwards explicit trash inclusion', async () => {
    const includeTrashedValues: boolean[] = [];
    const repository = {
      ...createRepository(),
      listAccessible: (
        _spaceId: string,
        _workspaceId: string,
        _userId: string,
        _role: 'ADMIN' | 'WORKER' | 'CLIENT',
        includeTrashed: boolean,
      ) => {
        includeTrashedValues.push(includeTrashed);
        return Promise.resolve([page]);
      },
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    await service.list('space-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);
    await service.list('space-a', 'workspace-a', 'user-a', USER_ROLE.WORKER, true);

    expect(includeTrashedValues).toEqual([false, true]);
  });

  it('returns an authorized direct page read', async () => {
    const service = new PagesService(
      createRepository(),
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );
    const result = await service.getAccessible('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(result.getValue().id).toBe('page-a');
  });

  it('returns an inaccessible result for a page the repository cannot authorize', async () => {
    const repository = { ...createRepository(), getAccessible: () => Promise.resolve(null) };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );
    const result = await service.getAccessible('private-page', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_ACCESS_DENIED');
  });

  it('moves a page only after validating the hierarchy', async () => {
    const service = new PagesService(
      createRepository(),
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );
    const result = await service.move(
      'page-a',
      'page-b',
      null,
      'user-a',
      'workspace-a',
      'mutation-a',
      USER_ROLE.WORKER,
    );

    expect(result.isOk()).toBe(true);
  });

  it('rejects creating a page under a parent from another space', async () => {
    const repository = { ...createRepository(), parentBelongsToSpace: () => Promise.resolve(false) };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );
    const result = await service.create(
      {
        content: validPageContent,
        createdById: 'user-a',
        parentId: 'page-other-space',
        propertyValues: null,
        role: USER_ROLE.WORKER,
        spaceId: 'space-a',
        title: 'Child',
        userId: 'user-a',
        workspaceId: 'workspace-a',
      },
      USER_ROLE.WORKER,
    );

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_PARENT_INVALID');
  });

  it('rejects moving a page below a descendant', async () => {
    const repository = {
      ...createRepository(),
      findMoveContext: () =>
        Promise.resolve({
          pageId: 'page-a',
          pages: [
            { id: 'page-a', parentId: null, spaceId: 'space-a' },
            { id: 'page-b', parentId: 'page-a', spaceId: 'space-a' },
          ],
          propertyValues: null,
          spaceId: 'space-a',
          title: 'Page A',
        }),
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );
    const result = await service.move(
      'page-a',
      'page-b',
      null,
      'user-a',
      'workspace-a',
      'mutation-c',
      USER_ROLE.WORKER,
    );

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_CYCLE');
  });

  it('trashes and restores a page through explicit lifecycle use cases', async () => {
    const service = new PagesService(
      createRepository(),
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const trashed = await service.trash('page-a', 'user-a', 'workspace-a', 'mutation-a', USER_ROLE.WORKER);
    const restored = await service.restore('page-a', 'user-a', 'workspace-a', 'mutation-b', USER_ROLE.WORKER);

    expect(trashed.isOk()).toBe(true);
    expect(restored.isOk()).toBe(true);
  });

  it('rejects trashing for a client role before touching the repository', async () => {
    let trashCascadeCalls = 0;
    const repository = {
      ...createRepository(),
      trashCascade: () => {
        trashCascadeCalls += 1;
        return Promise.resolve(true);
      },
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.trash('page-a', 'user-a', 'workspace-a', 'mutation-a', USER_ROLE.CLIENT);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_ACCESS_DENIED');
    expect(trashCascadeCalls).toBe(0);
  });

  it('reports how many pages would go to the trash together before trashing', async () => {
    const repository = { ...createRepository(), countDescendantsByLifecycle: () => Promise.resolve(3) };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.previewTrashCascade('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(result.getValue().childPageCount).toBe(3);
  });

  it('reports how many trashed pages would come back together before restoring', async () => {
    const repository = { ...createRepository(), countDescendantsByLifecycle: () => Promise.resolve(2) };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.previewRestoreCascade('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(result.getValue().childPageCount).toBe(2);
  });

  it('forwards the choice of restoring child pages to the repository', async () => {
    let receivedIncludeChildren: boolean | undefined;
    const repository = {
      ...createRepository(),
      restoreCascade: (
        _pageId: string,
        _userId: string,
        _workspaceId: string,
        _role: 'ADMIN' | 'WORKER' | 'CLIENT',
        _mutationId: string,
        includeChildren: boolean,
      ) => {
        receivedIncludeChildren = includeChildren;
        return Promise.resolve({
          parentTitle: 'Parent Page',
          restoredChildCount: includeChildren ? 4 : 0,
          restoredToRoot: false,
          spaceName: null,
        });
      },
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.restore('page-a', 'user-a', 'workspace-a', 'mutation-a', USER_ROLE.WORKER, true);

    expect(receivedIncludeChildren).toBe(true);
    expect(result.getValue()).toEqual({
      parentTitle: 'Parent Page',
      restoredChildCount: 4,
      restoredToRoot: false,
      spaceName: null,
    });
  });

  it('explains a restore placed the page at the root because its parent is gone', async () => {
    const repository = {
      ...createRepository(),
      restoreCascade: () =>
        Promise.resolve({ parentTitle: null, restoredChildCount: 0, restoredToRoot: true, spaceName: 'Engineering' }),
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.restore('page-a', 'user-a', 'workspace-a', 'mutation-a', USER_ROLE.WORKER);

    expect(result.getValue().restoredToRoot).toBe(true);
    expect(result.getValue().spaceName).toBe('Engineering');
  });

  it('lists the pages currently in the trash', async () => {
    const trashedSummary = {
      deletedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedBy: { id: 'user-a', name: 'Ada Lovelace' },
      id: 'page-a',
      isTemplate: false,
      parentId: null,
      purgeAfter: null,
      spaceId: 'space-a',
      title: 'Page A',
      trashedChildCount: 0,
    };
    const repository = { ...createRepository(), listTrashed: () => Promise.resolve([trashedSummary]) };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.listTrashed('workspace-a', 'user-a', USER_ROLE.WORKER, null, null);

    expect(result).toEqual([trashedSummary]);
  });

  it('schedules a trashed page for deletion in 30 days and leaves its attachments alone for now', async () => {
    let cleanedUpPageIds: readonly string[] = [];
    let scheduledFor: Date | undefined;
    const repository = {
      ...createRepository(),
      deleteForever: (_pageId: string, _workspaceId: string, _userId: string, _role: UserRole, purgeAfter: Date) => {
        scheduledFor = purgeAfter;
        return Promise.resolve('SCHEDULED' as const);
      },
    };
    const attachmentsRepository = {
      ...createAttachmentsCleanupRepository(),
      deleteForPages: (pageIds: readonly string[]) => {
        cleanedUpPageIds = pageIds;
        return Promise.resolve();
      },
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      attachmentsRepository,
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );
    const before = Date.now();

    const result = await service.deleteForever('page-a', 'workspace-a', 'user-a', USER_ROLE.ADMIN);

    expect(result.isOk()).toBe(true);
    expect(cleanedUpPageIds).toEqual([]);
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    expect((scheduledFor?.getTime() ?? 0) - before).toBeGreaterThanOrEqual(thirtyDays);
    expect(result.getValue().purgeAfter).toEqual(scheduledFor ?? new Date(0));
  });

  it('thins only the history older than thirty days', async () => {
    const seenCutoffs: Date[] = [];
    const service = new PagesService(
      createRepository(),
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(seenCutoffs),
    );
    const now = new Date('2026-10-31T12:00:00.000Z');

    await service.thinOldVersions(now);

    expect(seenCutoffs).toEqual([new Date('2026-10-01T12:00:00.000Z')]);
  });

  it('lets only an administrator delete forever', async () => {
    const service = new PagesService(
      createRepository(),
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const fromWorker = await service.deleteForever('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);
    const emptyFromWorker = await service.emptyTrash('workspace-a', 'user-a', USER_ROLE.WORKER, null);

    expect(fromWorker.isFail()).toBe(true);
    expect(emptyFromWorker.isFail()).toBe(true);
  });

  it('purges what is past its deadline in batches and only then removes the attachment files', async () => {
    const batches = [Array.from({ length: 100 }, (_, index) => `page-${String(index)}`), ['page-last']];
    const cleanedUp: string[] = [];
    let deletedStorageKeys: readonly string[] = [];
    const attachmentsRepository = {
      ...createAttachmentsCleanupRepository(),
      deleteForPages: (pageIds: readonly string[]) => {
        cleanedUp.push(...pageIds);
        return Promise.resolve();
      },
      listStorageKeysForPages: (pageIds: readonly string[]) =>
        Promise.resolve(pageIds.includes('page-last') ? ['storage-key-last'] : []),
    };
    const storageProvider = {
      ...createStorageProvider(),
      delete: (storageKey: string) => {
        deletedStorageKeys = [...deletedStorageKeys, storageKey];
        return Promise.resolve();
      },
    };
    const service = new PagesService(
      createRepository(),
      createSchemaRepository(),
      attachmentsRepository,
      storageProvider,
      createLogger(),
      createPurgeRepository(batches),
      createVersionRetentionRepository(),
    );

    const purgedCount = await service.purgeDuePages(new Date());

    expect(purgedCount).toBe(101);
    expect(cleanedUp).toHaveLength(101);
    expect(deletedStorageKeys).toEqual(['storage-key-last']);
  });

  it('rejects deleting forever a page that is not in the trash', async () => {
    const repository = {
      ...createRepository(),
      deleteForever: () => Promise.resolve('NOT_TRASHED' as const),
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.deleteForever('page-a', 'workspace-a', 'user-a', USER_ROLE.ADMIN);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_INVALID_LIFECYCLE');
  });

  it('empties the trash by scheduling every trashed page, deleting nothing yet', async () => {
    const repository = { ...createRepository(), emptyTrash: () => Promise.resolve(['page-a', 'page-b']) };
    let cleanedUpPageIds: readonly string[] = [];
    const attachmentsRepository = {
      ...createAttachmentsCleanupRepository(),
      deleteForPages: (pageIds: readonly string[]) => {
        cleanedUpPageIds = pageIds;
        return Promise.resolve();
      },
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      attachmentsRepository,
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.emptyTrash('workspace-a', 'user-a', USER_ROLE.ADMIN, null);

    expect(result.getValue().scheduledCount).toBe(2);
    expect(cleanedUpPageIds).toEqual([]);
  });

  it('refuses to write in a page somebody locked', async () => {
    const repository = {
      ...createRepository(),
      getAccessible: () => Promise.resolve({ ...page, lockedAt: new Date('2026-08-18T00:00:00.000Z') }),
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.authorizeContentWrite(contentWriter, validPageContent);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_LOCKED');
  });

  it('refuses to rename a page somebody locked', async () => {
    const repository = {
      ...createRepository(),
      getAccessible: () => Promise.resolve({ ...page, lockedAt: new Date('2026-08-18T00:00:00.000Z') }),
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.rename('page-a', 'Another name', 'user-a', 'workspace-a', USER_ROLE.WORKER);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_LOCKED');
  });

  it('lets a page be locked and let go again', async () => {
    const asked: boolean[] = [];
    const repository = {
      ...createRepository(),
      setLocked: (_pageId: string, locked: boolean) => {
        asked.push(locked);
        return Promise.resolve(page);
      },
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    await service.setLocked('page-a', true, 'user-a', 'workspace-a', USER_ROLE.WORKER);
    await service.setLocked('page-a', false, 'user-a', 'workspace-a', USER_ROLE.WORKER);

    expect(asked).toEqual([true, false]);
  });

  it('does not let a reader lock a page', async () => {
    const service = new PagesService(
      createRepository(),
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.setLocked('page-a', true, 'user-a', 'workspace-a', USER_ROLE.CLIENT);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_ACCESS_DENIED');
  });

  it('keeps a page cover with the framing it was given', async () => {
    let receivedCover: Parameters<PageRepositoryContract['updateCover']>[1] | undefined;
    const repository = {
      ...createRepository(),
      updateCover: (_pageId: string, cover: Parameters<PageRepositoryContract['updateCover']>[1]) => {
        receivedCover = cover;
        return Promise.resolve({ ...page, cover });
      },
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.updateCover(
      'page-a',
      { assetId: '019ff3f9-2bc6-7373-9f81-f4469fa28a36', position: 30 },
      'user-a',
      'workspace-a',
      USER_ROLE.WORKER,
    );

    expect(result.isOk()).toBe(true);
    expect(receivedCover).toEqual({ assetId: '019ff3f9-2bc6-7373-9f81-f4469fa28a36', position: 30 });
  });

  it('refuses a cover framed outside its own picture, without touching the page', async () => {
    let wasWritten = false;
    const repository = {
      ...createRepository(),
      updateCover: () => {
        wasWritten = true;
        return Promise.resolve(page);
      },
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.updateCover(
      'page-a',
      { assetId: '019ff3f9-2bc6-7373-9f81-f4469fa28a36', position: 400 },
      'user-a',
      'workspace-a',
      USER_ROLE.WORKER,
    );

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_COVER_INVALID');
    expect(wasWritten).toBe(false);
  });

  it('does not let a reader put a cover on a page', async () => {
    const service = new PagesService(
      createRepository(),
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.updateCover('page-a', null, 'user-a', 'workspace-a', USER_ROLE.CLIENT);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_ACCESS_DENIED');
  });

  it('sets a page icon to an emoji', async () => {
    let receivedIcon: Parameters<PageRepositoryContract['updateIcon']>[1] | undefined;
    const repository = {
      ...createRepository(),
      updateIcon: (_pageId: string, icon: Parameters<PageRepositoryContract['updateIcon']>[1]) => {
        receivedIcon = icon;
        return Promise.resolve({ ...page, icon });
      },
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.updateIcon(
      'page-a',
      { kind: 'emoji', value: '🚀' },
      'user-a',
      'workspace-a',
      USER_ROLE.WORKER,
    );

    expect(result.isOk()).toBe(true);
    expect(receivedIcon).toEqual({ kind: 'emoji', value: '🚀' });
  });

  it('clears a page icon when given null', async () => {
    let receivedIcon: Parameters<PageRepositoryContract['updateIcon']>[1] | undefined;
    const repository = {
      ...createRepository(),
      updateIcon: (_pageId: string, icon: Parameters<PageRepositoryContract['updateIcon']>[1]) => {
        receivedIcon = icon;
        return Promise.resolve({ ...page, icon: null });
      },
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.updateIcon('page-a', null, 'user-a', 'workspace-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(receivedIcon).toBeNull();
  });

  it('rejects a malformed page icon before repository mutation', async () => {
    let updateIconCalls = 0;
    const repository = {
      ...createRepository(),
      updateIcon: () => {
        updateIconCalls += 1;
        return Promise.resolve(page);
      },
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.updateIcon('page-a', { kind: 'sticker' }, 'user-a', 'workspace-a', USER_ROLE.WORKER);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_ICON_INVALID');
    expect(updateIconCalls).toBe(0);
  });

  it('rejects setting an icon for a client role', async () => {
    const service = new PagesService(
      createRepository(),
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.updateIcon(
      'page-a',
      { kind: 'emoji', value: '🚀' },
      'user-a',
      'workspace-a',
      USER_ROLE.CLIENT,
    );

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_ACCESS_DENIED');
  });

  it('verifies a page and stamps who verified it, with an expiration when given one', async () => {
    let received: Parameters<PageRepositoryContract['setVerification']> | undefined;
    const repository = {
      ...createRepository(),
      setVerification: (...args: Parameters<PageRepositoryContract['setVerification']>) => {
        received = args;
        return Promise.resolve({
          ...page,
          verificationExpiresAt: new Date('2026-09-01T00:00:00.000Z'),
          verifiedAt: new Date('2026-06-01T00:00:00.000Z'),
          verifiedBy: { id: 'user-a', name: 'Ada Lovelace' },
        });
      },
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.setVerification(
      'page-a',
      true,
      '2026-09-01T00:00:00.000Z',
      'user-a',
      'workspace-a',
      USER_ROLE.WORKER,
    );

    expect(result.isOk()).toBe(true);
    expect(result.getValue().verifiedBy).toEqual({ id: 'user-a', name: 'Ada Lovelace' });
    expect(received?.[1]).toBe(true);
    expect(received?.[2]).toEqual(new Date('2026-09-01T00:00:00.000Z'));
  });

  it('unverifies a page without asking for an expiration', async () => {
    let receivedExpiresAt: Date | null | undefined;
    const repository = {
      ...createRepository(),
      setVerification: (_pageId: string, _verified: boolean, expiresAt: Date | null) => {
        receivedExpiresAt = expiresAt;
        return Promise.resolve(page);
      },
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.setVerification('page-a', false, undefined, 'user-a', 'workspace-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(receivedExpiresAt).toBeNull();
  });

  it('does not let a reader verify a page', async () => {
    const service = new PagesService(
      createRepository(),
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.setVerification('page-a', true, undefined, 'user-a', 'workspace-a', USER_ROLE.CLIENT);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_ACCESS_DENIED');
  });

  it('assigns an owner who belongs to the workspace', async () => {
    let receivedOwnerId: null | string | undefined;
    const repository = {
      ...createRepository(),
      setOwner: (_pageId: string, ownerId: null | string) => {
        receivedOwnerId = ownerId;
        return Promise.resolve({ ...page, owner: { id: 'user-b', name: 'Grace Hopper' } });
      },
    };
    const schemaRepository = { ...createSchemaRepository(), listWorkspaceMemberIds: () => Promise.resolve(['user-b']) };
    const service = new PagesService(
      repository,
      schemaRepository,
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.setOwner('page-a', 'user-b', 'user-a', 'workspace-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(receivedOwnerId).toBe('user-b');
  });

  it('rejects an owner who is not a member of the workspace, without touching the repository', async () => {
    let setOwnerCalls = 0;
    const repository = {
      ...createRepository(),
      setOwner: () => {
        setOwnerCalls += 1;
        return Promise.resolve(page);
      },
    };
    const schemaRepository = { ...createSchemaRepository(), listWorkspaceMemberIds: () => Promise.resolve([]) };
    const service = new PagesService(
      repository,
      schemaRepository,
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.setOwner('page-a', 'stranger', 'user-a', 'workspace-a', USER_ROLE.WORKER);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_OWNER_INVALID');
    expect(setOwnerCalls).toBe(0);
  });

  it('clears an owner when given null, without checking membership', async () => {
    let receivedOwnerId: null | string | undefined = 'unset';
    const repository = {
      ...createRepository(),
      setOwner: (_pageId: string, ownerId: null | string) => {
        receivedOwnerId = ownerId;
        return Promise.resolve(page);
      },
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.setOwner('page-a', null, 'user-a', 'workspace-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(receivedOwnerId).toBeNull();
  });
});

const buildMentionNode = (pageId: string, label: string): JsonValue => ({
  attrs: { label, pageId, spaceId: 'space-a' },
  type: 'mention',
});

const buildMentionDocument = (...mentions: readonly (readonly [string, string])[]): JsonValue => ({
  content: mentions.map(([pageId, label]) => ({
    content: [buildMentionNode(pageId, label)],
    type: 'paragraph',
  })),
  schemaVersion: 1,
  type: 'doc',
});

const buildPageWithContent = (content: JsonValue) => ({ ...page, content });

describe('mention redaction on served page content', () => {
  it('keeps the real label when the reader can access the target', async () => {
    const repository = {
      ...createRepository(),
      getAccessible: () => Promise.resolve(buildPageWithContent(buildMentionDocument(['target-a', 'Roadmap 2026']))),
      findReadablePageIds: (pageIds: readonly string[]) => Promise.resolve(pageIds),
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.getAccessible('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(JSON.stringify(result.getValue().content)).toContain('Roadmap 2026');
  });

  it('replaces the label with the placeholder when the reader cannot access the target', async () => {
    const repository = {
      ...createRepository(),
      getAccessible: () =>
        Promise.resolve(buildPageWithContent(buildMentionDocument(['target-a', 'Confidential Salary Review']))),
      findReadablePageIds: () => Promise.resolve([]),
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.getAccessible('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);
    const serialized = JSON.stringify(result.getValue().content);

    expect(serialized).not.toContain('Confidential Salary Review');
    expect(serialized).toContain(REDACTED_MENTION_LABEL);
  });

  it('redacts a mention pointing at a page that no longer exists', async () => {
    const repository = {
      ...createRepository(),
      getAccessible: () => Promise.resolve(buildPageWithContent(buildMentionDocument(['deleted-page', 'Old Title']))),
      findReadablePageIds: () => Promise.resolve([]),
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.getAccessible('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(JSON.stringify(result.getValue().content)).not.toContain('Old Title');
  });

  it('redacts only the unreadable mention when the document mixes readable and unreadable targets', async () => {
    const repository = {
      ...createRepository(),
      getAccessible: () =>
        Promise.resolve(
          buildPageWithContent(
            buildMentionDocument(['target-readable', 'Readable Page'], ['target-hidden', 'Hidden Page']),
          ),
        ),
      findReadablePageIds: () => Promise.resolve(['target-readable']),
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.getAccessible('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);
    const serialized = JSON.stringify(result.getValue().content);

    expect(serialized).toContain('Readable Page');
    expect(serialized).not.toContain('Hidden Page');
  });

  it('resolves every mention target in a single query, never one per mention', async () => {
    const mentions = Array.from(
      { length: 40 },
      (_unused, index) => [`target-${String(index)}`, `Title ${String(index)}`] as const,
    );
    let callCount = 0;
    let receivedIds: readonly string[] = [];
    const repository = {
      ...createRepository(),
      getAccessible: () => Promise.resolve(buildPageWithContent(buildMentionDocument(...mentions))),
      findReadablePageIds: (pageIds: readonly string[]) => {
        callCount += 1;
        receivedIds = pageIds;
        return Promise.resolve(pageIds);
      },
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    await service.getAccessible('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(callCount).toBe(1);
    expect(receivedIds).toHaveLength(40);
  });

  it('resolves mentions across an entire page listing in a single query', async () => {
    const pages = [
      buildPageWithContent(buildMentionDocument(['target-a', 'Title A'])),
      buildPageWithContent(buildMentionDocument(['target-b', 'Title B'])),
    ];
    let callCount = 0;
    const repository = {
      ...createRepository(),
      listAccessible: () => Promise.resolve(pages),
      findReadablePageIds: (pageIds: readonly string[]) => {
        callCount += 1;
        return Promise.resolve(pageIds);
      },
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    await service.list('space-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(callCount).toBe(1);
  });

  it('leaves the stored content untouched after serving a redacted read', async () => {
    const storedPage = buildPageWithContent(buildMentionDocument(['target-a', 'Confidential Salary Review']));
    const repository = {
      ...createRepository(),
      getAccessible: () => Promise.resolve(storedPage),
      findReadablePageIds: () => Promise.resolve([]),
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    await service.getAccessible('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(JSON.stringify(storedPage.content)).toContain('Confidential Salary Review');
  });

  it('redacts the moved page returned by move, since the caller never submitted its content', async () => {
    const repository = {
      ...createRepository(),
      move: () =>
        Promise.resolve(buildPageWithContent(buildMentionDocument(['target-a', 'Confidential Salary Review']))),
      findReadablePageIds: () => Promise.resolve([]),
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.move(
      'page-a',
      'page-b',
      null,
      'user-a',
      'workspace-a',
      'mutation-a',
      USER_ROLE.WORKER,
    );
    const serialized = JSON.stringify(result.getValue().content);

    expect(result.isOk()).toBe(true);
    expect(serialized).not.toContain('Confidential Salary Review');
    expect(serialized).toContain(REDACTED_MENTION_LABEL);
  });
});

describe('markdown export', () => {
  it('writes a branch out as one markdown file, mother before daughter', async () => {
    const body: JsonValue = {
      content: [{ content: [{ text: 'Example', type: 'text' }], type: 'paragraph' }],
      schemaVersion: 1,
      type: 'doc',
    };
    const mother = { ...buildPageWithContent(body), id: 'page-a', title: 'Madre' };
    const daughter = { ...buildPageWithContent(body), id: 'page-b', parentId: 'page-a', title: 'Hija' };
    const repository: PageRepositoryContract = {
      ...createRepository(),
      listAccessible: () => Promise.resolve([mother, daughter]),
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.exportAsMarkdown(
      'space-a',
      { kind: 'branch', pageId: 'page-a' },
      'workspace-a',
      'user-a',
      USER_ROLE.WORKER,
      'Sin nombre',
    );

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toEqual([
      { contents: '# Madre\n\nExample', path: 'Madre.md' },
      { contents: '# Hija\n\nExample', path: 'Madre/Hija.md' },
    ]);
  });

  it('refuses to write out a page the reader cannot reach', async () => {
    const service = new PagesService(
      createRepository(),
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.exportAsMarkdown(
      'space-a',
      { kind: 'page', pageId: 'somebody-elses-page' },
      'workspace-a',
      'user-a',
      USER_ROLE.WORKER,
      'Sin nombre',
    );

    expect(result.isFail()).toBe(true);
  });

  it('refuses an export whose attachments pass the cap, before reading any of them', async () => {
    let reads = 0;
    const attachmentsRepository = {
      ...createAttachmentsCleanupRepository(),
      listAssetsForPages: () =>
        Promise.resolve([{ id: 'asset-a', originalFilename: 'big.zip', size: 257 * 1024 * 1024, storageKey: 'key-a' }]),
    };
    const storageProvider = {
      ...createStorageProvider(),
      read: () => {
        reads += 1;
        return Promise.resolve(Buffer.from(''));
      },
    };
    const service = new PagesService(
      createRepository(),
      createSchemaRepository(),
      attachmentsRepository,
      storageProvider,
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.exportAsMarkdown(
      'space-a',
      { kind: 'page', pageId: 'page-a' },
      'workspace-a',
      'user-a',
      USER_ROLE.WORKER,
      'Sin nombre',
    );

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_EXPORT_TOO_LARGE');
    expect(reads).toBe(0);
  });
});

describe('pages service — updating what a row holds', () => {
  const titleProperty = {
    config: DEFAULT_PAGE_PROPERTY_CONFIG,
    key: 'title',
    label: 'Title',
    options: null,
    required: true,
    type: DatabasePropertyType.TITLE,
  };

  const statusProperty = {
    config: DEFAULT_PAGE_PROPERTY_CONFIG,
    key: 'status',
    label: 'Status',
    options: [
      { color: null, group: null, id: 'todo0001', value: 'todo' },
      { color: null, group: null, id: 'done0001', value: 'done' },
    ],
    required: false,
    type: DatabasePropertyType.SELECT,
  };

  const buildService = (schemaOverrides: Partial<PageSchemaRepositoryContract> = {}, updated = page) =>
    new PagesService(
      {
        ...createRepository(),
        updatePropertyValues: (_input, merge) => {
          const merged = merge(page.propertyValues);
          return Promise.resolve(merged.isOk() ? Result.ok(updated) : Result.fail(merged.getError()));
        },
      },
      { ...createSchemaRepository(), ...schemaOverrides },
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

  const notesProperty = {
    config: DEFAULT_PAGE_PROPERTY_CONFIG,
    key: 'notes',
    label: 'Notes',
    options: null,
    required: false,
    type: DatabasePropertyType.RICH_TEXT,
  };

  const buildServiceRecordingWrites = (
    written: Record<string, unknown>[],
    storedValues: SchemaPropertyValues,
    schemaProperties: readonly SchemaPropertyDefinition[],
  ) =>
    new PagesService(
      {
        ...createRepository(),
        getAccessible: () => Promise.resolve({ ...page, propertyValues: storedValues }),
        updatePropertyValues: (_input, merge) => {
          const merged = merge(storedValues);
          if (merged.isFail()) return Promise.resolve(Result.fail(merged.getError()));
          written.push({ ...merged.getValue() });
          return Promise.resolve(Result.ok(page));
        },
      },
      { ...createSchemaRepository(), resolveSchemaProperties: () => Promise.resolve(schemaProperties) },
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

  it('writes only what was named, leaving the rest of the row as it was', async () => {
    const written: Record<string, unknown>[] = [];
    const service = buildServiceRecordingWrites(written, { notes: 'Sigue igual', status: 'todo0001' }, [
      titleProperty,
      statusProperty,
      notesProperty,
    ]);

    const result = await service.updateProperties({
      pageId: 'page-a',
      propertyValues: { status: 'done0001' },
      role: USER_ROLE.WORKER,
      updatedById: 'user-a',
      userId: 'user-a',
      workspaceId: 'workspace-a',
    });

    expect(result.isOk()).toBe(true);
    expect(written[0]).toEqual({ notes: 'Sigue igual', status: 'done0001' });
  });

  it('renames the row in the same write as its properties, so both land or neither does', async () => {
    const received: UpdatePagePropertyValuesInput[] = [];
    const service = new PagesService(
      {
        ...createRepository(),
        getAccessible: () => Promise.resolve({ ...page, propertyValues: { status: 'todo0001' } }),
        updatePropertyValues: (input, merge) => {
          received.push(input);
          const merged = merge({ status: 'todo0001' });
          return Promise.resolve(merged.isFail() ? Result.fail(merged.getError()) : Result.ok(page));
        },
      },
      { ...createSchemaRepository(), resolveSchemaProperties: () => Promise.resolve([titleProperty, statusProperty]) },
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.updateProperties({
      pageId: 'page-a',
      propertyValues: { status: 'done0001' },
      role: USER_ROLE.WORKER,
      title: 'Informe entregado',
      updatedById: 'user-a',
      userId: 'user-a',
      workspaceId: 'workspace-a',
    });

    expect(result.isOk()).toBe(true);
    expect(received).toEqual([
      {
        pageId: 'page-a',
        role: USER_ROLE.WORKER,
        title: 'Informe entregado',
        updatedById: 'user-a',
        workspaceId: 'workspace-a',
      },
    ]);
  });

  // A row keeps values under a property later removed from the shape; carrying them back would be refused and block
  // every later save, so they are dropped on the first write.
  it('leaves behind a value the shape no longer knows, instead of locking the row', async () => {
    const written: Record<string, unknown>[] = [];
    const service = buildServiceRecordingWrites(written, { removed: 'Quedó huérfano', status: 'todo0001' }, [
      titleProperty,
      statusProperty,
    ]);

    const result = await service.updateProperties({
      pageId: 'page-a',
      propertyValues: { status: 'done0001' },
      role: USER_ROLE.WORKER,
      updatedById: 'user-a',
      userId: 'user-a',
      workspaceId: 'workspace-a',
    });

    expect(result.isOk()).toBe(true);
    expect(written[0]).toEqual({ status: 'done0001' });
  });

  it('clears a property when what arrives for it is nothing', async () => {
    const written: Record<string, unknown>[] = [];
    const service = buildServiceRecordingWrites(written, { notes: 'Sigue', status: 'todo0001' }, [
      titleProperty,
      statusProperty,
      notesProperty,
    ]);

    const result = await service.updateProperties({
      pageId: 'page-a',
      propertyValues: { status: null },
      role: USER_ROLE.WORKER,
      updatedById: 'user-a',
      userId: 'user-a',
      workspaceId: 'workspace-a',
    });

    expect(result.isOk()).toBe(true);
    expect(written[0]).toEqual({ notes: 'Sigue' });
  });

  it('refuses a value the shape does not allow instead of writing it', async () => {
    const service = buildService({ resolveSchemaProperties: () => Promise.resolve([titleProperty, statusProperty]) });

    const result = await service.updateProperties({
      pageId: 'page-a',
      propertyValues: { status: 'inventado' },
      role: USER_ROLE.WORKER,
      updatedById: 'user-a',
      userId: 'user-a',
      workspaceId: 'workspace-a',
    });

    expect(result.isFail()).toBe(true);
  });

  it('refuses to touch a locked page', async () => {
    const service = new PagesService(
      {
        ...createRepository(),
        getAccessible: () => Promise.resolve({ ...page, lockedAt: new Date('2026-01-01T00:00:00.000Z') }),
      },
      { ...createSchemaRepository(), resolveSchemaProperties: () => Promise.resolve([titleProperty, statusProperty]) },
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.updateProperties({
      pageId: 'page-a',
      propertyValues: { status: 'done0001' },
      role: USER_ROLE.WORKER,
      updatedById: 'user-a',
      userId: 'user-a',
      workspaceId: 'workspace-a',
    });

    expect(result.isFail()).toBe(true);
  });

  it('refuses a page this reader could not open', async () => {
    const service = new PagesService(
      { ...createRepository(), getAccessible: () => Promise.resolve(null) },
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      createPurgeRepository(),
      createVersionRetentionRepository(),
    );

    const result = await service.updateProperties({
      pageId: 'somebody-elses-page',
      propertyValues: { status: 'done0001' },
      role: USER_ROLE.WORKER,
      updatedById: 'user-a',
      userId: 'user-a',
      workspaceId: 'workspace-a',
    });

    expect(result.isFail()).toBe(true);
  });
});

describe('pages service: the history and the content of a page', () => {
  const buildService = (repository: Partial<PageRepositoryContract>, purge = createPurgeRepository()) =>
    new PagesService(
      { ...createRepository(), ...repository },
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
      createLogger(),
      purge,
      createVersionRetentionRepository(),
    );

  it('restores a page to a version and answers with the page', async () => {
    const service = buildService({ restoreVersion: () => Promise.resolve({ page }) });

    const result = await service.restoreVersion('page-a', 1, 'user-a', 'workspace-a', USER_ROLE.WORKER);

    expect(result.getValue()).toBe(page);
  });

  it('says that a version that is not there is not there', async () => {
    const service = buildService({ restoreVersion: () => Promise.resolve('MISSING_VERSION') });

    const result = await service.restoreVersion('page-a', 9, 'user-a', 'workspace-a', USER_ROLE.WORKER);

    expect(result.getError().code).toBe('PAGE_VERSION_NOT_FOUND');
  });

  it('lists the versions of a page the reader can reach, and nothing for one who may not', async () => {
    const listing = {
      items: [{ author: { id: 'user-a', name: 'Ana' }, createdAt: new Date(0), title: 'Page A', version: 2 }],
      nextCursor: null,
    };
    const service = buildService({ listVersions: () => Promise.resolve(listing) });
    const unreachable = buildService({ listVersions: () => Promise.resolve(null) });

    expect((await service.listVersions('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER, null, 20)).getValue()).toBe(
      listing,
    );
    expect(
      (await service.listVersions('page-a', 'workspace-a', 'user-a', USER_ROLE.CLIENT, null, 20)).getError().code,
    ).toBe('PAGE_ACCESS_DENIED');
    expect(
      (await unreachable.listVersions('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER, null, 20)).getError().code,
    ).toBe('PAGE_ACCESS_DENIED');
  });

  it('reads one version, and tells a version that is not there from a page that cannot be reached', async () => {
    const snapshot = { content: validPageContent, title: 'Page A', version: 1 };
    const service = buildService({ findVersion: () => Promise.resolve(snapshot) });
    const missing = buildService({});
    const unreachable = buildService({ getAccessible: () => Promise.resolve(null) });

    expect((await service.readVersion('page-a', 1, 'workspace-a', 'user-a', USER_ROLE.WORKER)).getValue()).toBe(
      snapshot,
    );
    expect((await missing.readVersion('page-a', 9, 'workspace-a', 'user-a', USER_ROLE.WORKER)).getError().code).toBe(
      'PAGE_VERSION_NOT_FOUND',
    );
    expect(
      (await unreachable.readVersion('page-a', 1, 'workspace-a', 'user-a', USER_ROLE.WORKER)).getError().code,
    ).toBe('PAGE_ACCESS_DENIED');
    expect((await service.readVersion('page-a', 1, 'workspace-a', 'user-a', USER_ROLE.CLIENT)).getError().code).toBe(
      'PAGE_ACCESS_DENIED',
    );
  });

  it('never restores a version for someone who may only read, or into a page in the trash or locked', async () => {
    const trashed = buildService({
      getAccessible: () => Promise.resolve({ ...page, lifecycle: PageLifecycle.TRASHED }),
    });
    const locked = buildService({ getAccessible: () => Promise.resolve({ ...page, lockedAt: new Date() }) });
    const reader = buildService({});

    expect((await reader.restoreVersion('page-a', 1, 'user-a', 'workspace-a', USER_ROLE.CLIENT)).getError().code).toBe(
      'PAGE_ACCESS_DENIED',
    );
    expect((await trashed.restoreVersion('page-a', 1, 'user-a', 'workspace-a', USER_ROLE.WORKER)).getError().code).toBe(
      'PAGE_INVALID_LIFECYCLE',
    );
    expect((await locked.restoreVersion('page-a', 1, 'user-a', 'workspace-a', USER_ROLE.WORKER)).getError().code).toBe(
      'PAGE_LOCKED',
    );
  });

  it('writes the content through the repository and says the page is out of reach when it could not', async () => {
    const written = validPageContent;
    const accepted = buildService({ writeContent: () => Promise.resolve(written) });
    const refused = buildService({ writeContent: () => Promise.resolve(null) });

    expect((await accepted.writeContent(contentWriter, (current) => current)).getValue()).toBe(written);
    expect((await refused.writeContent(contentWriter, (current) => current)).getError().code).toBe(
      'PAGE_ACCESS_DENIED',
    );
  });

  it('keeps purging while a batch comes back full, even when the pages below the due ones make it longer', async () => {
    const full = Array.from({ length: 101 }, (_unused, position) => `page-${String(position)}`);
    const service = buildService({}, createPurgeRepository([full, ['last']]));

    expect(await service.purgeDuePages(new Date())).toBe(102);
  });
});
