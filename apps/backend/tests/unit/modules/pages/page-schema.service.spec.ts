import { describe, expect, it } from 'bun:test';
import { DatabasePropertyType, DatabaseViewType, PageLifecycle } from '@neuma/db';
import { DEFAULT_PAGE_PROPERTY_CONFIG, Result, USER_ROLE } from '@neuma/shared';
import { SCHEMA_OPTION_ALREADY_MOVED } from '@/modules/pages/constants/pages.constants';
import { PageSchemaService } from '@/modules/pages/page-schema.service';
import type { PageRepositoryContract, PageSummary } from '@/modules/pages/types/page.types';
import type { PageSchemaRepositoryContract } from '@/modules/pages/types/page-schema.types';

const titleProperty = {
  config: DEFAULT_PAGE_PROPERTY_CONFIG,
  key: 'title',
  label: 'Title',
  type: DatabasePropertyType.TITLE,
  required: true,
  options: null,
};
const statusProperty = {
  config: DEFAULT_PAGE_PROPERTY_CONFIG,
  key: 'status',
  label: 'Status',
  type: DatabasePropertyType.SELECT,
  required: false,
  options: [
    { color: null, group: null, id: 'todo0001', value: 'todo' },
    { color: null, group: null, id: 'done0001', value: 'done' },
  ],
};
const titleDraft = { ...titleProperty, twoWay: false };
const statusDraft = { ...statusProperty, twoWay: false };

const page: PageSummary = {
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
  title: 'Collection',
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedBy: null,
  verificationExpiresAt: null,
  verifiedAt: null,
  verifiedBy: null,
  version: 1,
};

const createPageRepository = (overrides: Partial<PageRepositoryContract> = {}): PageRepositoryContract => ({
  countDescendantsByLifecycle: () => Promise.resolve(0),
  create: () => Promise.resolve(page),
  deleteForever: () => Promise.resolve('SCHEDULED'),
  duplicate: () => Promise.resolve(page),
  emptyTrash: () => Promise.resolve([]),
  findReadablePageIds: (pageIds) => Promise.resolve(pageIds),
  getAccessible: () => Promise.resolve(page),
  findMoveContext: () => Promise.resolve(null),
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
  setOwner: () => Promise.resolve(page),
  setVerification: () => Promise.resolve(page),
  updateCover: () => Promise.resolve(page),
  updateIcon: () => Promise.resolve(page),
  ...overrides,
});

const noRows = { attachedFiles: [], hasMore: false, relatedRows: [], rows: [] };

const createSchemaRepository = (
  overrides: Partial<PageSchemaRepositoryContract> = {},
): PageSchemaRepositoryContract => ({
  attachFilesToPage: () => Promise.resolve(),
  defineSchema: (pageId, shape) => Promise.resolve({ pageId, ...shape }),
  findAttachableFileIds: () => Promise.resolve(new Set<string>()),
  findCollectionIds: () => Promise.resolve(new Set<string>()),
  getSchema: (pageId) => Promise.resolve({ pageId, properties: [titleProperty], views: [] }),
  rewriteOption: (pageId, _propertyKey, _change, properties) => Promise.resolve({ pageId, properties, views: [] }),
  listPersonPropertyKeys: () => Promise.resolve(new Map()),
  resolveSchemaProperties: () => Promise.resolve([titleProperty]),
  listWorkspaceMemberIds: () => Promise.resolve([]),
  readRowsById: () => Promise.resolve(noRows),
  ...overrides,
});

describe('page schema service — defineSchema', () => {
  it('rejects a client role', async () => {
    const service = new PageSchemaService(createPageRepository(), createSchemaRepository());

    const result = await service.defineSchema({
      pageId: 'page-a',
      properties: [titleDraft],
      role: USER_ROLE.CLIENT,
      userId: 'user-a',
      views: [],
      workspaceId: 'workspace-a',
    });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_ACCESS_DENIED');
  });

  it('rejects an inaccessible page', async () => {
    const service = new PageSchemaService(
      createPageRepository({ getAccessible: () => Promise.resolve(null) }),
      createSchemaRepository(),
    );

    const result = await service.defineSchema({
      pageId: 'page-a',
      properties: [titleDraft],
      role: USER_ROLE.WORKER,
      userId: 'user-a',
      views: [],
      workspaceId: 'workspace-a',
    });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_ACCESS_DENIED');
  });

  it('rejects a definition missing its single TITLE property before persistence', async () => {
    let defineCalls = 0;
    const service = new PageSchemaService(
      createPageRepository(),
      createSchemaRepository({
        defineSchema: (pageId, shape) => {
          defineCalls += 1;
          return Promise.resolve({ pageId, ...shape });
        },
      }),
    );

    const result = await service.defineSchema({
      pageId: 'page-a',
      properties: [statusDraft],
      role: USER_ROLE.WORKER,
      userId: 'user-a',
      views: [],
      workspaceId: 'workspace-a',
    });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_SCHEMA_DEFINITION_INVALID');
    expect(defineCalls).toBe(0);
  });

  it('rejects a board view whose groupBy does not reference a SELECT property', async () => {
    const service = new PageSchemaService(createPageRepository(), createSchemaRepository());

    const result = await service.defineSchema({
      pageId: 'page-a',
      properties: [titleDraft],
      role: USER_ROLE.WORKER,
      userId: 'user-a',
      views: [{ name: 'Board', type: DatabaseViewType.BOARD, configuration: { groupBy: 'title' }, isDefault: true }],
      workspaceId: 'workspace-a',
    });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_SCHEMA_DEFINITION_INVALID');
  });

  it('persists a well-formed schema and returns the owning page space', async () => {
    const service = new PageSchemaService(
      createPageRepository(),
      createSchemaRepository({
        getSchema: (pageId) => Promise.resolve({ pageId, properties: [titleProperty, statusProperty], views: [] }),
      }),
    );

    const result = await service.defineSchema({
      pageId: 'page-a',
      properties: [titleDraft, statusDraft],
      role: USER_ROLE.WORKER,
      userId: 'user-a',
      views: [],
      workspaceId: 'workspace-a',
    });

    expect(result.isOk()).toBe(true);
    expect(result.getValue().spaceId).toBe('space-a');
    expect(result.getValue().properties).toEqual([titleProperty, statusProperty]);
  });

  it('gives a new option an id of its own and keeps the id of one that was already saved', async () => {
    const service = new PageSchemaService(
      createPageRepository(),
      createSchemaRepository({
        getSchema: (pageId) => Promise.resolve({ pageId, properties: [titleProperty, statusProperty], views: [] }),
      }),
    );

    const result = await service.defineSchema({
      pageId: 'page-a',
      properties: [
        titleDraft,
        {
          ...statusDraft,
          options: [
            { color: null, group: null, id: 'todo0001', value: 'pendiente' },
            { color: null, group: null, id: null, value: 'blocked' },
          ],
        },
      ],
      role: USER_ROLE.WORKER,
      userId: 'user-a',
      views: [],
      workspaceId: 'workspace-a',
    });

    const options = result.getValue().properties[1]?.options ?? [];
    expect(options[0]).toMatchObject({ id: 'todo0001', value: 'pendiente' });
    expect(options[1]?.id).toMatch(/^[a-z0-9]{8}$/);
    expect(options[1]?.value).toBe('blocked');
  });
});

describe('page schema service — rewriteOption', () => {
  const renaming = {
    optionId: 'todo0001',
    pageId: 'page-a',
    propertyKey: 'status',
    role: USER_ROLE.WORKER,
    to: 'pendiente',
    userId: 'user-a',
    workspaceId: 'workspace-a',
  };
  const schemaWithStatus = () =>
    createSchemaRepository({
      getSchema: (pageId) => Promise.resolve({ pageId, properties: [titleProperty, statusProperty], views: [] }),
    });

  it('rejects a client role', async () => {
    const service = new PageSchemaService(createPageRepository(), schemaWithStatus());

    const result = await service.rewriteOption({ ...renaming, role: USER_ROLE.CLIENT });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_ACCESS_DENIED');
  });

  it('rejects an inaccessible page', async () => {
    const service = new PageSchemaService(
      createPageRepository({ getAccessible: () => Promise.resolve(null) }),
      schemaWithStatus(),
    );

    const result = await service.rewriteOption(renaming);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_ACCESS_DENIED');
  });

  it('rejects a name another option already answers to', async () => {
    const service = new PageSchemaService(createPageRepository(), schemaWithStatus());

    const result = await service.rewriteOption({ ...renaming, to: 'done' });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('SCHEMA_PROPERTY_DEFINITION_INVALID');
  });

  it('gives up when somebody else moved that same option first', async () => {
    const service = new PageSchemaService(
      createPageRepository(),
      createSchemaRepository({
        getSchema: (pageId) => Promise.resolve({ pageId, properties: [titleProperty, statusProperty], views: [] }),
        rewriteOption: () => Promise.resolve(SCHEMA_OPTION_ALREADY_MOVED),
      }),
    );

    const result = await service.rewriteOption(renaming);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('SCHEMA_PROPERTY_DEFINITION_INVALID');
  });

  it('hands the rewritten shape to the repository, together with where the name comes from', async () => {
    const asked: { change?: unknown; properties?: unknown }[] = [];
    const service = new PageSchemaService(
      createPageRepository(),
      createSchemaRepository({
        getSchema: (pageId) => Promise.resolve({ pageId, properties: [titleProperty, statusProperty], views: [] }),
        rewriteOption: (pageId, _propertyKey, change, properties) => {
          asked.push({ change, properties });
          return Promise.resolve({ pageId, properties, views: [] });
        },
      }),
    );

    const result = await service.rewriteOption(renaming);

    expect(result.isOk()).toBe(true);
    expect(asked[0]?.change).toEqual({ optionId: 'todo0001', replacementId: null, to: 'pendiente' });
    expect(asked).toHaveLength(1);
    expect(result.getValue().properties[1]?.options).toEqual([
      { color: null, group: null, id: 'todo0001', value: 'pendiente' },
      { color: null, group: null, id: 'done0001', value: 'done' },
    ]);
  });

  it('removes the option when no new name is given, leaving the rest of the options alone', async () => {
    const service = new PageSchemaService(createPageRepository(), schemaWithStatus());

    const result = await service.rewriteOption({ ...renaming, to: null });

    expect(result.isOk()).toBe(true);
    expect(result.getValue().properties[1]?.options).toEqual([
      { color: null, group: null, id: 'done0001', value: 'done' },
    ]);
  });
});

describe('page schema service — getSchema', () => {
  it('rejects an inaccessible page', async () => {
    const service = new PageSchemaService(
      createPageRepository({ getAccessible: () => Promise.resolve(null) }),
      createSchemaRepository(),
    );

    const result = await service.getSchema('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_ACCESS_DENIED');
  });

  it('returns the schema for an accessible page', async () => {
    const service = new PageSchemaService(createPageRepository(), createSchemaRepository());

    const result = await service.getSchema('page-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toEqual({ pageId: 'page-a', properties: [titleProperty], spaceId: 'space-a', views: [] });
  });
});

describe('page schema service — listCollections', () => {
  it('lists only the pages of the space that carry a shape', async () => {
    const other = { ...page, id: 'page-b', title: 'Notes' };
    const service = new PageSchemaService(
      createPageRepository({ listAccessible: () => Promise.resolve([page, other]) }),
      createSchemaRepository({ findCollectionIds: () => Promise.resolve(new Set(['page-a'])) }),
    );

    const collections = await service.listCollections('space-a', 'workspace-a', 'user-a', USER_ROLE.WORKER);

    expect(collections).toEqual([{ id: 'page-a', title: 'Collection' }]);
  });
});
