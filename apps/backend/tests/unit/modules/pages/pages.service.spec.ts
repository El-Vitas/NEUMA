import { describe, expect, it } from 'bun:test';
import { PageLifecycle } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';
import { type PageContent, USER_ROLE } from '@company-brain/shared';
import type { IStorageProvider } from '@/common/types/storage.types';
import { REDACTED_MENTION_LABEL } from '@/modules/pages/constants/pages.constants';
import { PagesService } from '@/modules/pages/pages.service';
import type {
  PageAttachmentsCleanupRepositoryContract,
  PageRepositoryContract,
  UpdatePageInput,
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

const buildUpdatePageInput = (content: Prisma.InputJsonValue = validPageContent): UpdatePageInput => ({
  content,
  pageId: 'page-a',
  propertyValues: null,
  role: USER_ROLE.WORKER,
  title: 'Updated',
  updatedById: 'user-a',
  userId: 'user-a',
  workspaceId: 'workspace-a',
});

const createRepository = (): PageRepositoryContract => ({
  countDescendantsByLifecycle: () => Promise.resolve(0),
  create: () => Promise.resolve(page),
  deleteForever: () => Promise.resolve('DELETED'),
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
  update: () => Promise.resolve(page),
  rename: () => Promise.resolve(page),
  setLocked: () => Promise.resolve(page),
  setOwner: () => Promise.resolve(page),
  setVerification: () => Promise.resolve(page),
  updateCover: () => Promise.resolve(page),
  updateIcon: () => Promise.resolve(page),
});

const createSchemaRepository = (): PageSchemaRepositoryContract => ({
  defineSchema: (pageId, properties, views) => Promise.resolve({ pageId, properties, views }),
  getSchema: (pageId) => Promise.resolve({ pageId, properties: [], views: [] }),
  resolveSchemaProperties: () => Promise.resolve([]),
  listRows: () => Promise.resolve([]),
  listWorkspaceMemberIds: () => Promise.resolve([]),
});

const createAttachmentsCleanupRepository = (): PageAttachmentsCleanupRepositoryContract => ({
  deleteForPages: () => Promise.resolve(),
  listStorageKeysForPages: () => Promise.resolve([]),
});

const createStorageProvider = (): IStorageProvider => ({
  delete: () => Promise.resolve(),
  read: () => Promise.resolve(Buffer.from('')),
  save: () => Promise.resolve('storage-key'),
});

describe('pages service', () => {
  it('updates a page for an editor', async () => {
    const service = new PagesService(
      createRepository(),
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
    );
    const result = await service.update(buildUpdatePageInput(), USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
  });

  const invalidPageContents: { content: Prisma.InputJsonObject; name: string }[] = [
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

  it.each(invalidPageContents)('rejects update content with $name before repository mutation', async ({ content }) => {
    let updateCalls = 0;
    const repository = {
      ...createRepository(),
      update: () => {
        updateCalls += 1;
        return Promise.resolve(page);
      },
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
    );

    const result = await service.update(buildUpdatePageInput(content), USER_ROLE.WORKER);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_CONTENT_INVALID');
    expect(updateCalls).toBe(0);
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
    let receivedContent: Prisma.InputJsonValue | undefined;
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
    expect(receivedContent).toEqual(validPageContent);
  });

  it('forwards valid update content and preserves the repository version', async () => {
    const versionedPage = { ...page, version: 2 };
    let receivedContent: Prisma.InputJsonValue | undefined;
    const repository = {
      ...createRepository(),
      update: (input: Parameters<PageRepositoryContract['update']>[0]) => {
        receivedContent = input.content;
        return Promise.resolve(versionedPage);
      },
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
    );

    const result = await service.update(buildUpdatePageInput(), USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(receivedContent).toEqual(validPageContent);
    expect(result.getValue().version).toBe(2);
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
      parentId: null,
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
    );

    const result = await service.listTrashed('workspace-a', 'user-a', USER_ROLE.WORKER, null, null);

    expect(result).toEqual([trashedSummary]);
  });

  it('deletes a trashed page forever and cleans up its attachments', async () => {
    let cleanedUpPageIds: readonly string[] = [];
    const attachmentsRepository = {
      ...createAttachmentsCleanupRepository(),
      deleteForPages: (pageIds: readonly string[]) => {
        cleanedUpPageIds = pageIds;
        return Promise.resolve();
      },
      listStorageKeysForPages: () => Promise.resolve(['storage-key-a']),
    };
    let deletedStorageKeys: readonly string[] = [];
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
    );

    const result = await service.deleteForever('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(cleanedUpPageIds).toEqual(['page-a']);
    expect(deletedStorageKeys).toEqual(['storage-key-a']);
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
    );

    const result = await service.deleteForever('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_INVALID_LIFECYCLE');
  });

  it('empties the trash and cleans up every deleted page attachment', async () => {
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
    );

    const result = await service.emptyTrash('workspace-a', 'user-a', USER_ROLE.WORKER, null);

    expect(result.getValue()).toEqual({ deletedCount: 2 });
    expect(cleanedUpPageIds).toEqual(['page-a', 'page-b']);
  });

  it('refuses to write in a page somebody locked', async () => {
    let wasWritten = false;
    const repository = {
      ...createRepository(),
      getAccessible: () => Promise.resolve({ ...page, lockedAt: new Date('2026-08-18T00:00:00.000Z') }),
      update: () => {
        wasWritten = true;
        return Promise.resolve(page);
      },
    };
    const service = new PagesService(
      repository,
      createSchemaRepository(),
      createAttachmentsCleanupRepository(),
      createStorageProvider(),
    );

    const result = await service.update(
      {
        content: { content: [{ content: [], type: 'paragraph' }], schemaVersion: 1, type: 'doc' },
        pageId: 'page-a',
        propertyValues: null,
        role: USER_ROLE.WORKER,
        title: 'Page A',
        updatedById: 'user-a',
        userId: 'user-a',
        workspaceId: 'workspace-a',
      },
      USER_ROLE.WORKER,
    );

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_LOCKED');
    expect(wasWritten).toBe(false);
  });

  /** Renaming a page is writing in it, so a lock stops that too. */
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
    );

    const result = await service.setOwner('page-a', null, 'user-a', 'workspace-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(receivedOwnerId).toBeNull();
  });
});

const buildMentionNode = (pageId: string, label: string): Prisma.JsonValue => ({
  attrs: { label, pageId, spaceId: 'space-a' },
  type: 'mention',
});

const buildMentionDocument = (...mentions: readonly (readonly [string, string])[]): Prisma.JsonValue => ({
  content: mentions.map(([pageId, label]) => ({
    content: [buildMentionNode(pageId, label)],
    type: 'paragraph',
  })),
  schemaVersion: 1,
  type: 'doc',
});

const buildPageWithContent = (content: Prisma.JsonValue) => ({ ...page, content });

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
