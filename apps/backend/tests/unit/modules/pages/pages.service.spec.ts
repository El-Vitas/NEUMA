import { describe, expect, it } from 'bun:test';
import { PageLifecycle } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';
import { type PageContent, USER_ROLE } from '@company-brain/shared';
import { PagesService } from '@/modules/pages/pages.service';
import type { PageRepositoryContract, UpdatePageInput } from '@/modules/pages/types/page.types';

const validPageContent: PageContent = {
  content: [{ content: [{ text: 'Example', type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
};

const page = {
  content: {},
  id: 'page-a',
  lifecycle: PageLifecycle.ACTIVE,
  order: 0,
  parentId: null,
  spaceId: 'space-a',
  title: 'Page A',
  version: 1,
};

const buildUpdatePageInput = (content: Prisma.InputJsonValue = validPageContent): UpdatePageInput => ({
  content,
  pageId: 'page-a',
  role: USER_ROLE.WORKER,
  title: 'Updated',
  updatedById: 'user-a',
  userId: 'user-a',
  workspaceId: 'workspace-a',
});

const createRepository = (): PageRepositoryContract => ({
  create: () => Promise.resolve(page),
  getAccessible: () => Promise.resolve(page),
  findMoveContext: () =>
    Promise.resolve({
      pageId: 'page-a',
      pages: [
        { id: 'page-a', parentId: null, spaceId: 'space-a' },
        { id: 'page-b', parentId: null, spaceId: 'space-a' },
      ],
    }),
  move: () => Promise.resolve(page),
  parentBelongsToSpace: () => Promise.resolve(true),
  listAccessible: () => Promise.resolve([page]),
  setLifecycle: () => Promise.resolve(true),
  update: () => Promise.resolve(page),
});

describe('pages service', () => {
  it('updates a page for an editor', async () => {
    const service = new PagesService(createRepository());
    const result = await service.update(buildUpdatePageInput(), USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
  });

  const invalidPageContents: { content: Prisma.InputJsonObject; name: string }[] = [
    {
      content: { content: [{ content: [], type: 'unknown' }], schemaVersion: 1, type: 'doc' },
      name: 'an unknown node type',
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
    const service = new PagesService(repository);

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
    const service = new PagesService(repository);

    const result = await service.create(
      {
        content: { content: [], schemaVersion: 1, type: 'doc' },
        createdById: 'user-a',
        parentId: null,
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
    const service = new PagesService(repository);

    const result = await service.create(
      {
        content: validPageContent,
        createdById: 'user-a',
        parentId: null,
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
    const service = new PagesService(repository);

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
    const service = new PagesService(repository);

    await service.list('space-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);
    await service.list('space-a', 'workspace-a', 'user-a', USER_ROLE.WORKER, true);

    expect(includeTrashedValues).toEqual([false, true]);
  });

  it('returns an authorized direct page read', async () => {
    const service = new PagesService(createRepository());
    const result = await service.getAccessible('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(result.getValue().id).toBe('page-a');
  });

  it('returns an inaccessible result for a page the repository cannot authorize', async () => {
    const repository = { ...createRepository(), getAccessible: () => Promise.resolve(null) };
    const service = new PagesService(repository);
    const result = await service.getAccessible('private-page', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_ACCESS_DENIED');
  });

  it('moves a page only after validating the hierarchy', async () => {
    const service = new PagesService(createRepository());
    const result = await service.move('page-a', 'page-b', 'user-a', 'workspace-a', 'mutation-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
  });

  it('rejects creating a page under a parent from another space', async () => {
    const repository = { ...createRepository(), parentBelongsToSpace: () => Promise.resolve(false) };
    const service = new PagesService(repository);
    const result = await service.create(
      {
        content: validPageContent,
        createdById: 'user-a',
        parentId: 'page-other-space',
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
        }),
    };
    const service = new PagesService(repository);
    const result = await service.move('page-a', 'page-b', 'user-a', 'workspace-a', 'mutation-c', USER_ROLE.WORKER);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_CYCLE');
  });

  it('trashes and restores a page through explicit lifecycle use cases', async () => {
    const service = new PagesService(createRepository());

    const trashed = await service.trash('page-a', 'user-a', 'workspace-a', 'mutation-a', USER_ROLE.WORKER);
    const restored = await service.restore('page-a', 'user-a', 'workspace-a', 'mutation-b', USER_ROLE.WORKER);

    expect(trashed.isOk()).toBe(true);
    expect(restored.isOk()).toBe(true);
  });
});
