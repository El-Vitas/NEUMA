import {
  DatabasePropertyType,
  DatabaseViewType,
  type JsonObject,
  type NeumaDatabase,
  OutboxConsumer,
  SpaceVisibility,
  UserRole,
} from '../../src/index.js';
import type { SeedUsers } from './users.seed.js';

type SeedModels = NeumaDatabase['orm']['public'];

const workspaceId = '11111111-1111-4111-8111-111111111111';
const spaceId = '22222222-2222-4222-8222-222222222222';
const rootPageId = '33333333-3333-4333-8333-333333333333';
const gettingStartedPageId = '44444444-4444-4444-8444-444444444444';
const architecturePageId = '55555555-5555-4555-8555-555555555555';
const tableViewId = '77777777-7777-4777-8777-777777777777';
const boardViewId = '88888888-8888-4888-8888-888888888888';
const titlePropertyId = '99999999-9999-4999-8999-999999999999';
const statusPropertyId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const assigneePropertyId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const priorityPropertyId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const dueDatePropertyId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const descriptionPropertyId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const firstRecordId = 'f1111111-1111-4111-8111-111111111111';
const secondRecordId = 'f2222222-2222-4222-8222-222222222222';
const thirdRecordId = 'f3333333-3333-4333-8333-333333333333';

const tasksPageId = 'a1111111-1111-4111-8111-111111111111';
const tasksTableViewId = 'a2222222-2222-4222-8222-222222222222';
const tasksBoardViewId = 'a3333333-3333-4333-8333-333333333333';
const tasksTitlePropertyId = 'a4444444-4444-4444-8444-444444444444';
const tasksStatusPropertyId = 'a5555555-5555-4555-8555-555555555555';
const tasksAssigneePropertyId = 'a6666666-6666-4666-8666-666666666666';
const tasksPriorityPropertyId = 'a7777777-7777-4777-8777-777777777777';
const tasksDueDatePropertyId = 'a8888888-8888-4888-8888-888888888888';
const tasksDescriptionPropertyId = 'a9999999-9999-4999-8999-999999999999';
const taskRowSetupEnvironmentId = 'b1111111-1111-4111-8111-111111111111';
const taskRowDocumentArchitectureId = 'b2222222-2222-4222-8222-222222222222';
const taskRowReviewPortalContentId = 'b3333333-3333-4333-8333-333333333333';

const rootBlockId = 'c1111111-1111-4111-8111-111111111111';
const gettingStartedBlockId = 'c2222222-2222-4222-8222-222222222222';
const architectureBlockId = 'c3333333-3333-4333-8333-333333333333';
const tasksBlockId = 'c4444444-4444-4444-8444-444444444444';
const setupEnvironmentBlockId = 'c5555555-5555-4555-8555-555555555555';
const documentArchitectureBlockId = 'c6666666-6666-4666-8666-666666666666';
const reviewPortalContentBlockId = 'c7777777-7777-4777-8777-777777777777';

/** Blocks carry fixed ids, as the editor would give them, so search and links can point at them. */
const pageContent = (blockId: string, text: string): JsonObject => ({
  content: [{ attrs: { id: blockId }, content: [{ text, type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
});

const pageContentWithMention = (
  blockId: string,
  leadText: string,
  mention: { label: string; pageId: string },
  trailingText: string,
): JsonObject => ({
  content: [
    {
      attrs: { id: blockId },
      content: [
        { text: leadText, type: 'text' },
        { attrs: { label: mention.label, pageId: mention.pageId, spaceId }, type: 'mention' },
        { text: trailingText, type: 'text' },
      ],
      type: 'paragraph',
    },
  ],
  schemaVersion: 1,
  type: 'doc',
});

const seedWorkspace = async (models: SeedModels): Promise<void> => {
  const updatedCount = await models.Workspace.where({ singletonKey: 'default' }).updateAndCount({ name: 'Neuma' });
  if (updatedCount > 0) return;
  await models.Workspace.create({ id: workspaceId, name: 'Neuma', singletonKey: 'default' });
};

const seedWorkspaceMembers = async (models: SeedModels, users: SeedUsers): Promise<void> => {
  const members = [
    { role: UserRole.ADMIN, userId: users.adminId },
    { role: UserRole.WORKER, userId: users.workerId },
    { role: UserRole.CLIENT, userId: users.clientId },
  ] as const;

  await models.WorkspaceMember.where({ workspaceId })
    .where((member) => member.userId.notIn(members.map((seedMember) => seedMember.userId)))
    .deleteAndCount();
  for (const member of members) {
    const updatedCount = await models.WorkspaceMember.where({ userId: member.userId, workspaceId }).updateAndCount({
      role: member.role,
    });
    if (updatedCount === 0) {
      await models.WorkspaceMember.create({ role: member.role, userId: member.userId, workspaceId });
    }
  }
};

const seedSpace = async (models: SeedModels): Promise<void> => {
  const updatedCount = await models.Space.where({ slug: 'engineering', workspaceId }).updateAndCount({
    name: 'Engineering',
    visibility: SpaceVisibility.PUBLIC_INTERNAL,
  });
  if (updatedCount > 0) return;
  await models.Space.create({
    id: spaceId,
    name: 'Engineering',
    slug: 'engineering',
    visibility: SpaceVisibility.PUBLIC_INTERNAL,
    workspaceId,
  });
};

const seedPage = async (
  models: SeedModels,
  page: {
    id: string;
    parentId: string | null;
    title: string;
    content: JsonObject;
    order: number;
    propertyValues?: JsonObject;
  },
  userId: string,
): Promise<void> => {
  await models.Page.upsert({
    conflictOn: { id: page.id },
    create: { ...page, createdById: userId, spaceId, updatedById: userId },
    update: { ...page, createdById: userId, updatedById: userId },
  });
  const pageBlock = {
    createdById: userId,
    editedById: userId,
    parentId: page.parentId,
    properties: { title: page.title },
    spaceId,
    type: 'page',
  };
  await models.Block.upsert({
    conflictOn: { id: page.id },
    create: { ...pageBlock, id: page.id },
    update: pageBlock,
  });
  const updatedCount = await models.PageVersion.where({ pageId: page.id, version: 1 }).updateAndCount({
    content: page.content,
    createdById: userId,
    title: page.title,
  });
  if (updatedCount > 0) return;
  await models.PageVersion.create({
    content: page.content,
    createdById: userId,
    pageId: page.id,
    title: page.title,
    version: 1,
  });
};

/** The same event the backend writes when a page is created, so the projection workers index seeded pages too. */
const announcePages = async (models: SeedModels, pageIds: readonly string[]): Promise<void> => {
  for (const pageId of pageIds) {
    await models.OutboxEvent.create({
      aggregateId: pageId,
      aggregateType: 'PAGE',
      deliveries: (deliveries) => deliveries.create(Object.values(OutboxConsumer).map((consumer) => ({ consumer }))),
      eventType: 'PAGE_CREATED',
      idempotencyKey: `page:${pageId}:version:1`,
      payload: { pageId, spaceId, version: 1 },
      payloadVersion: 1,
    });
  }
};

const seedPages = async (models: SeedModels, users: SeedUsers): Promise<void> => {
  const userId = users.adminId;
  const pages = [
    {
      content: pageContent(rootBlockId, 'A practical guide to how the Engineering team works.'),
      id: rootPageId,
      order: 0,
      parentId: null,
      title: 'Engineering Handbook',
    },
    {
      content: pageContent(
        gettingStartedBlockId,
        'Start here to set up your local environment and make your first change.',
      ),
      id: gettingStartedPageId,
      order: 0,
      parentId: rootPageId,
      title: 'Getting Started',
    },
    {
      content: pageContent(
        architectureBlockId,
        'The system is organized into a portal, backend, and shared database packages.',
      ),
      id: architecturePageId,
      order: 1,
      parentId: rootPageId,
      title: 'Architecture',
    },
    {
      content: pageContent(tasksBlockId, 'Track engineering work as a table or as a board grouped by status.'),
      id: tasksPageId,
      order: 1,
      parentId: null,
      title: 'Tasks',
    },
    {
      content: pageContentWithMention(
        setupEnvironmentBlockId,
        'Prepare the local development environment. See ',
        { label: 'Getting Started', pageId: gettingStartedPageId },
        ' for the setup steps.',
      ),
      id: taskRowSetupEnvironmentId,
      order: 0,
      parentId: tasksPageId,
      propertyValues: {
        assignee: users.workerId,
        description: 'Prepare the local development environment.',
        dueDate: '2026-08-10',
        priority: 'high',
        status: 'in_progress',
      },
      title: 'Set up local development',
    },
    {
      content: pageContentWithMention(
        documentArchitectureBlockId,
        'Document the service boundaries and data flow, building on ',
        { label: 'Architecture', pageId: architecturePageId },
        '.',
      ),
      id: taskRowDocumentArchitectureId,
      order: 1,
      parentId: tasksPageId,
      propertyValues: {
        assignee: users.adminId,
        description: 'Document the service boundaries and data flow.',
        dueDate: '2026-08-14',
        priority: 'medium',
        status: 'todo',
      },
      title: 'Document service architecture',
    },
    {
      content: pageContent(reviewPortalContentBlockId, 'Review the first portal content and share feedback.'),
      id: taskRowReviewPortalContentId,
      order: 2,
      parentId: tasksPageId,
      propertyValues: {
        assignee: users.clientId,
        description: 'Review the first portal content and share feedback.',
        dueDate: '2026-08-21',
        priority: 'low',
        status: 'done',
      },
      title: 'Review portal content',
    },
  ] as const;

  await models.Page.where({ spaceId })
    .where((page) => page.id.notIn(pages.map((seedPageRow) => seedPageRow.id)))
    .deleteAndCount();
  for (const page of pages) await seedPage(models, page, userId);
  await announcePages(
    models,
    pages.map((page) => page.id),
  );
};

const seedPageSchema = async (models: SeedModels): Promise<void> => {
  const properties = [
    {
      id: tasksTitlePropertyId,
      key: 'title',
      label: 'Title',
      options: null,
      order: 0,
      required: true,
      type: DatabasePropertyType.TITLE,
    },
    {
      id: tasksStatusPropertyId,
      key: 'status',
      label: 'Status',
      options: [
        { color: 'GRAY', value: 'todo' },
        { color: 'BLUE', value: 'in_progress' },
        { color: 'GREEN', value: 'done' },
      ],
      order: 1,
      required: true,
      type: DatabasePropertyType.SELECT,
    },
    {
      id: tasksAssigneePropertyId,
      key: 'assignee',
      label: 'Assignee',
      options: null,
      order: 2,
      required: false,
      type: DatabasePropertyType.PERSON,
    },
    {
      id: tasksPriorityPropertyId,
      key: 'priority',
      label: 'Priority',
      options: [
        { color: 'GRAY', value: 'low' },
        { color: 'YELLOW', value: 'medium' },
        { color: 'RED', value: 'high' },
      ],
      order: 3,
      required: false,
      type: DatabasePropertyType.SELECT,
    },
    {
      id: tasksDueDatePropertyId,
      key: 'dueDate',
      label: 'Due date',
      options: null,
      order: 4,
      required: false,
      type: DatabasePropertyType.DATE,
    },
    {
      id: tasksDescriptionPropertyId,
      key: 'description',
      label: 'Description',
      options: null,
      order: 5,
      required: false,
      type: DatabasePropertyType.RICH_TEXT,
    },
  ] as const;

  await models.PageSchemaProperty.where({ pageId: tasksPageId })
    .where((property) => property.id.notIn(properties.map((seedProperty) => seedProperty.id)))
    .deleteAndCount();
  for (const property of properties) {
    await models.PageSchemaProperty.upsert({
      conflictOn: { id: property.id },
      create: { ...property, pageId: tasksPageId },
      update: { ...property, pageId: tasksPageId },
    });
  }

  const views = [
    {
      /** Empty: a configuration only accepts filter, grouping and sort, and the server rejects anything else. */
      configuration: {},
      id: tasksTableViewId,
      isDefault: true,
      name: 'Table',
      type: DatabaseViewType.TABLE,
    },
    {
      configuration: { groupBy: 'status' },
      id: tasksBoardViewId,
      isDefault: false,
      name: 'Board',
      type: DatabaseViewType.BOARD,
    },
  ] as const;
  await models.PageSchemaView.where({ pageId: tasksPageId })
    .where((schemaView) => schemaView.id.notIn(views.map((seedView) => seedView.id)))
    .deleteAndCount();
  for (const view of views) {
    await models.PageSchemaView.upsert({
      conflictOn: { id: view.id },
      create: { ...view, pageId: tasksPageId },
      update: { ...view, pageId: tasksPageId },
    });
  }
};

const seedPageLinks = async (models: SeedModels): Promise<void> => {
  const links = [
    { sourcePageId: taskRowSetupEnvironmentId, targetPageId: gettingStartedPageId },
    { sourcePageId: taskRowDocumentArchitectureId, targetPageId: architecturePageId },
  ] as const;

  for (const sourcePageId of new Set(links.map((link) => link.sourcePageId))) {
    const targetPageIds = links.filter((link) => link.sourcePageId === sourcePageId).map((link) => link.targetPageId);
    await models.PageLink.where({ sourcePageId })
      .where((link) => link.targetPageId.notIn(targetPageIds))
      .deleteAndCount();
  }
  await models.PageLink.createAndCount(
    links.map((link) => ({ ...link })),
    { onConflict: 'skip' },
  );
};

export const seedDemo = async (database: NeumaDatabase, users: SeedUsers): Promise<void> => {
  await database.transaction(async (transaction) => {
    const models = transaction.orm.public;
    await seedWorkspace(models);
    await seedWorkspaceMembers(models, users);
    await seedSpace(models);
    await seedPages(models, users);
    await seedPageSchema(models);
    await seedPageLinks(models);
  });
};
