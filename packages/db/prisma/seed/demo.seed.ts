import {
  DatabasePropertyType,
  DatabaseViewType,
  type JsonObject,
  type NeumaDatabase,
  SpaceVisibility,
  UserRole,
} from '../../src/index.js';
import { encodeTextState, type SeedSegment, toPlainText, toRichText } from './rich-text.seed.js';
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
/** An option is told apart by an id of eight letters or digits (ADR 024); fixed here so every seed run is the same. */
const statusTodoOptionId = 'sttodo01';
const statusInProgressOptionId = 'stdoing1';
const statusDoneOptionId = 'stdone01';
const priorityLowOptionId = 'prlow001';
const priorityMediumOptionId = 'prmid001';
const priorityHighOptionId = 'prhigh01';
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

const toInlineNode = (segment: SeedSegment): JsonObject =>
  typeof segment === 'string'
    ? { text: segment, type: 'text' }
    : { attrs: { label: segment.label, pageId: segment.pageId, spaceId }, type: 'mention' };

/** The document a version keeps; its paragraph carries the id of the block that holds the same text. */
const toPageContent = (blockId: string, segments: readonly SeedSegment[]): JsonObject => ({
  content: [{ attrs: { id: blockId }, content: segments.map(toInlineNode), type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
});

const isMentionSegment = (segment: SeedSegment): segment is Exclude<SeedSegment, string> => typeof segment !== 'string';

interface SeedPageRow {
  id: string;
  paragraphId: string;
  parentId: string | null;
  paragraph: readonly SeedSegment[];
  title: string;
  propertyValues?: JsonObject;
}

/** The operations a page takes to be written: its own `set`, plus one listing for each child it holds. */
const countPageOperations = (childCount: number): number => 1 + childCount;

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

/** A page is a block that lists its paragraph first and its subpages after it, as the app writes it (ADR 021). */
const seedPageBlocks = async (
  models: SeedModels,
  page: SeedPageRow,
  subpageIds: readonly string[],
  userId: string,
): Promise<void> => {
  const titleText = toRichText([page.title], spaceId);
  const paragraphText = toRichText(page.paragraph, spaceId);
  const children = [page.paragraphId, ...subpageIds];
  const authorship = { createdById: userId, editedById: userId, spaceId };
  const pageBlock = {
    ...authorship,
    children,
    parentId: page.parentId,
    properties: { title: titleText, ...(page.propertyValues === undefined ? {} : { values: page.propertyValues }) },
    text: page.title,
    textState: encodeTextState('title', titleText),
    type: 'page',
    version: countPageOperations(children.length),
  };
  const paragraphBlock = {
    ...authorship,
    parentId: page.id,
    properties: { title: paragraphText },
    text: toPlainText(page.paragraph),
    textState: encodeTextState('title', paragraphText),
    type: 'paragraph',
    version: 1,
  };
  await models.Block.upsert({ conflictOn: { id: page.id }, create: { ...pageBlock, id: page.id }, update: pageBlock });
  await models.Block.upsert({
    conflictOn: { id: page.paragraphId },
    create: { ...paragraphBlock, id: page.paragraphId },
    update: paragraphBlock,
  });
};

const seedPageVersion = async (models: SeedModels, page: SeedPageRow, userId: string): Promise<void> => {
  const content = toPageContent(page.paragraphId, page.paragraph);
  const updatedCount = await models.PageVersion.where({ pageId: page.id, version: 1 }).updateAndCount({
    content,
    createdById: userId,
    title: page.title,
  });
  if (updatedCount > 0) return;
  await models.PageVersion.create({ content, createdById: userId, pageId: page.id, title: page.title, version: 1 });
};

/** The mentions of each paragraph, as the backend reconciles them in the transaction that writes the block. */
const seedBlockLinks = async (models: SeedModels, pages: readonly SeedPageRow[]): Promise<void> => {
  for (const page of pages) {
    const targetBlockIds = page.paragraph.filter(isMentionSegment).map((mention) => mention.pageId);
    await models.BlockLink.where({ sourceBlockId: page.paragraphId })
      .where((link) => link.targetBlockId.notIn(targetBlockIds))
      .deleteAndCount();
    await models.BlockLink.createAndCount(
      targetBlockIds.map((targetBlockId) => ({
        kind: 'mention',
        sourceBlockId: page.paragraphId,
        sourcePageId: page.id,
        targetBlockId,
      })),
      { onConflict: 'skip' },
    );
  }
};

const seedPages = async (models: SeedModels, users: SeedUsers): Promise<void> => {
  const userId = users.adminId;
  const pages: readonly SeedPageRow[] = [
    {
      id: rootPageId,
      paragraph: ['A practical guide to how the Engineering team works.'],
      paragraphId: rootBlockId,
      parentId: null,
      title: 'Engineering Handbook',
    },
    {
      id: gettingStartedPageId,
      paragraph: ['Start here to set up your local environment and make your first change.'],
      paragraphId: gettingStartedBlockId,
      parentId: rootPageId,
      title: 'Getting Started',
    },
    {
      id: architecturePageId,
      paragraph: ['The system is organized into a portal, backend, and shared database packages.'],
      paragraphId: architectureBlockId,
      parentId: rootPageId,
      title: 'Architecture',
    },
    {
      id: tasksPageId,
      paragraph: ['Track engineering work as a table or as a board grouped by status.'],
      paragraphId: tasksBlockId,
      parentId: null,
      title: 'Tasks',
    },
    {
      id: taskRowSetupEnvironmentId,
      paragraph: [
        'Prepare the local development environment. See ',
        { label: 'Getting Started', pageId: gettingStartedPageId },
        ' for the setup steps.',
      ],
      paragraphId: setupEnvironmentBlockId,
      parentId: tasksPageId,
      propertyValues: {
        assignee: [users.workerId],
        description: 'Prepare the local development environment.',
        dueDate: { start: '2026-08-10' },
        priority: priorityHighOptionId,
        status: statusInProgressOptionId,
      },
      title: 'Set up local development',
    },
    {
      id: taskRowDocumentArchitectureId,
      paragraph: [
        'Document the service boundaries and data flow, building on ',
        { label: 'Architecture', pageId: architecturePageId },
        '.',
      ],
      paragraphId: documentArchitectureBlockId,
      parentId: tasksPageId,
      propertyValues: {
        assignee: [users.adminId],
        description: 'Document the service boundaries and data flow.',
        dueDate: { start: '2026-08-14' },
        priority: priorityMediumOptionId,
        status: statusTodoOptionId,
      },
      title: 'Document service architecture',
    },
    {
      id: taskRowReviewPortalContentId,
      paragraph: ['Review the first portal content and share feedback.'],
      paragraphId: reviewPortalContentBlockId,
      parentId: tasksPageId,
      propertyValues: {
        assignee: [users.clientId],
        description: 'Review the first portal content and share feedback.',
        dueDate: { start: '2026-08-21' },
        priority: priorityLowOptionId,
        status: statusDoneOptionId,
      },
      title: 'Review portal content',
    },
  ];

  const seededBlockIds = pages.flatMap((page) => [page.id, page.paragraphId]);
  await models.Block.where({ spaceId })
    .where((block) => block.id.notIn(seededBlockIds))
    .deleteAndCount();
  for (const page of pages) {
    const subpageIds = pages.filter((candidate) => candidate.parentId === page.id).map((subpage) => subpage.id);
    await seedPageBlocks(models, page, subpageIds, userId);
    await seedPageVersion(models, page, userId);
  }
  const rootPageIds = pages.filter((page) => page.parentId === null).map((page) => page.id);
  await models.Space.where({ id: spaceId }).updateAndCount({ rootPageIds });
  await seedBlockLinks(models, pages);
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
        { color: 'GRAY', id: statusTodoOptionId, value: 'todo' },
        { color: 'BLUE', id: statusInProgressOptionId, value: 'in_progress' },
        { color: 'GREEN', id: statusDoneOptionId, value: 'done' },
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
        { color: 'GRAY', id: priorityLowOptionId, value: 'low' },
        { color: 'YELLOW', id: priorityMediumOptionId, value: 'medium' },
        { color: 'RED', id: priorityHighOptionId, value: 'high' },
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

export const seedDemo = async (database: NeumaDatabase, users: SeedUsers): Promise<void> => {
  await database.transaction(async (transaction) => {
    const models = transaction.orm.public;
    await seedWorkspace(models);
    await seedWorkspaceMembers(models, users);
    await seedSpace(models);
    await seedPages(models, users);
    await seedPageSchema(models);
  });
};
