import type { PrismaClient } from '../../src/client.js';
import {
  DatabasePropertyType,
  DatabaseViewType,
  Prisma,
  SpaceVisibility,
  UserRole,
} from '../../src/generated/client.js';
import type { SeedUsers } from './users.seed.js';

type SeedClient = Prisma.TransactionClient;

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

const pageContent = (text: string): Prisma.InputJsonObject => ({
  content: [{ content: [{ text, type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
});

const pageContentWithMention = (
  leadText: string,
  mention: { label: string; pageId: string },
  trailingText: string,
): Prisma.InputJsonObject => ({
  content: [
    {
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

const seedWorkspace = async (prisma: SeedClient): Promise<void> => {
  await prisma.workspace.upsert({
    where: { singletonKey: 'default' },
    create: { id: workspaceId, name: 'Company Brain', singletonKey: 'default' },
    update: { name: 'Company Brain' },
  });
};

const seedWorkspaceMembers = async (prisma: SeedClient, users: SeedUsers): Promise<void> => {
  const members = [
    { role: UserRole.ADMIN, userId: users.adminId },
    { role: UserRole.WORKER, userId: users.workerId },
    { role: UserRole.CLIENT, userId: users.clientId },
  ] as const;

  await prisma.workspaceMember.deleteMany({
    where: { workspaceId, userId: { notIn: members.map((member) => member.userId) } },
  });
  for (const member of members) {
    await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { userId: member.userId, workspaceId } },
      create: { role: member.role, userId: member.userId, workspaceId },
      update: { role: member.role },
    });
  }
};

const seedSpace = async (prisma: SeedClient): Promise<void> => {
  await prisma.space.upsert({
    where: { workspaceId_slug: { slug: 'engineering', workspaceId } },
    create: {
      id: spaceId,
      name: 'Engineering',
      slug: 'engineering',
      visibility: SpaceVisibility.PUBLIC_INTERNAL,
      workspaceId,
    },
    update: { name: 'Engineering', visibility: SpaceVisibility.PUBLIC_INTERNAL },
  });
};

const seedPage = async (
  prisma: SeedClient,
  page: {
    id: string;
    parentId: string | null;
    title: string;
    content: Prisma.InputJsonObject;
    order: number;
    propertyValues?: Prisma.InputJsonObject;
  },
  userId: string,
): Promise<void> => {
  await prisma.page.upsert({
    where: { id: page.id },
    create: { ...page, createdById: userId, spaceId, updatedById: userId },
    update: { ...page, createdById: userId, updatedById: userId },
  });
  await prisma.pageVersion.upsert({
    where: { pageId_version: { pageId: page.id, version: 1 } },
    create: { content: page.content, createdById: userId, pageId: page.id, title: page.title, version: 1 },
    update: { content: page.content, createdById: userId, title: page.title },
  });
};

const seedPages = async (prisma: SeedClient, users: SeedUsers): Promise<void> => {
  const userId = users.adminId;
  const pages = [
    {
      content: pageContent('A practical guide to how the Engineering team works.'),
      id: rootPageId,
      order: 0,
      parentId: null,
      title: 'Engineering Handbook',
    },
    {
      content: pageContent('Start here to set up your local environment and make your first change.'),
      id: gettingStartedPageId,
      order: 0,
      parentId: rootPageId,
      title: 'Getting Started',
    },
    {
      content: pageContent('The system is organized into a portal, backend, and shared database packages.'),
      id: architecturePageId,
      order: 1,
      parentId: rootPageId,
      title: 'Architecture',
    },
    {
      content: pageContent('Track engineering work as a table or as a board grouped by status.'),
      id: tasksPageId,
      order: 1,
      parentId: null,
      title: 'Tasks',
    },
    {
      content: pageContentWithMention(
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
      content: pageContent('Review the first portal content and share feedback.'),
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

  await prisma.page.deleteMany({ where: { spaceId, id: { notIn: pages.map((page) => page.id) } } });
  for (const page of pages) await seedPage(prisma, page, userId);
};

const seedPageSchema = async (prisma: SeedClient): Promise<void> => {
  const properties = [
    {
      id: tasksTitlePropertyId,
      key: 'title',
      label: 'Title',
      options: Prisma.DbNull,
      order: 0,
      required: true,
      type: DatabasePropertyType.TITLE,
    },
    {
      id: tasksStatusPropertyId,
      key: 'status',
      label: 'Status',
      options: ['todo', 'in_progress', 'done'],
      order: 1,
      required: true,
      type: DatabasePropertyType.SELECT,
    },
    {
      id: tasksAssigneePropertyId,
      key: 'assignee',
      label: 'Assignee',
      options: Prisma.DbNull,
      order: 2,
      required: false,
      type: DatabasePropertyType.PERSON,
    },
    {
      id: tasksPriorityPropertyId,
      key: 'priority',
      label: 'Priority',
      options: ['low', 'medium', 'high'],
      order: 3,
      required: false,
      type: DatabasePropertyType.SELECT,
    },
    {
      id: tasksDueDatePropertyId,
      key: 'dueDate',
      label: 'Due date',
      options: Prisma.DbNull,
      order: 4,
      required: false,
      type: DatabasePropertyType.DATE,
    },
    {
      id: tasksDescriptionPropertyId,
      key: 'description',
      label: 'Description',
      options: Prisma.DbNull,
      order: 5,
      required: false,
      type: DatabasePropertyType.RICH_TEXT,
    },
  ] as const;

  await prisma.pageSchemaProperty.deleteMany({
    where: { pageId: tasksPageId, id: { notIn: properties.map((property) => property.id) } },
  });
  for (const property of properties) {
    await prisma.pageSchemaProperty.upsert({
      where: { id: property.id },
      create: { ...property, pageId: tasksPageId },
      update: { ...property, pageId: tasksPageId },
    });
  }

  const views = [
    {
      configuration: { columns: ['status', 'assignee', 'priority', 'dueDate', 'description'] },
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
  await prisma.pageSchemaView.deleteMany({
    where: { pageId: tasksPageId, id: { notIn: views.map((view) => view.id) } },
  });
  for (const view of views) {
    await prisma.pageSchemaView.upsert({
      where: { id: view.id },
      create: { ...view, pageId: tasksPageId },
      update: { ...view, pageId: tasksPageId },
    });
  }
};

const seedPageLinks = async (prisma: SeedClient): Promise<void> => {
  const links = [
    { sourcePageId: taskRowSetupEnvironmentId, targetPageId: gettingStartedPageId },
    { sourcePageId: taskRowDocumentArchitectureId, targetPageId: architecturePageId },
  ] as const;

  for (const sourcePageId of new Set(links.map((link) => link.sourcePageId))) {
    const targetPageIds = links.filter((link) => link.sourcePageId === sourcePageId).map((link) => link.targetPageId);
    await prisma.pageLink.deleteMany({ where: { sourcePageId, targetPageId: { notIn: targetPageIds } } });
  }
  await prisma.pageLink.createMany({ data: links.map((link) => ({ ...link })), skipDuplicates: true });
};

export const seedDemo = async (prisma: PrismaClient, users: SeedUsers): Promise<void> => {
  await prisma.$transaction(async (transaction) => {
    await seedWorkspace(transaction);
    await seedWorkspaceMembers(transaction, users);
    await seedSpace(transaction);
    await seedPages(transaction, users);
    await seedPageSchema(transaction);
    await seedPageLinks(transaction);
  });
};
