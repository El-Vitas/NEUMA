import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { DatabasePropertyType, DatabaseViewType, SpaceVisibility } from '@neuma/db';
import { DEFAULT_PAGE_PROPERTY_CONFIG, type PageContent, USER_ROLE } from '@neuma/shared';
import request from 'supertest';
import { COLLECTION_ROW_LIMIT } from '@/modules/pages/constants/pages.constants';
import { PageSchemaService } from '@/modules/pages/page-schema.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface SpaceResponse {
  id: string;
}

interface PageResponse {
  id: string;
  parentId: null | string;
  propertyValues: Record<string, unknown> | null;
  title: string;
}

interface PageRowsResponse {
  hasMore: boolean;
  rows: PageResponse[];
}

interface PageSchemaResponse {
  pageId: string;
  properties: { key: string; options?: { id: string; value: string }[] | null; type: string }[];
  views: unknown[];
}

const optionIdOf = (schema: PageSchemaResponse, key: string, name: string): string => {
  const id = schema.properties.find((property) => property.key === key)?.options?.find((o) => o.value === name)?.id;
  if (id === undefined) throw new Error(`The schema has no option ${name} in ${key}`);
  return id;
};

const plainContent = (text: string): PageContent => ({
  content: [{ content: [{ text, type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
});

const promoteToAdmin = async (testApp: TestApp, email: string): Promise<void> => {
  const prisma = testApp.get(PrismaService);
  await prisma.models.User.where({ email }).update({ role: 'ADMIN' });
};

const createSpace = async (
  testApp: TestApp,
  token: string,
  name: string,
  slug: string,
  visibility: SpaceVisibility,
): Promise<string> => {
  const response = await request(testApp.getServer())
    .post('/api/v1/spaces')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, slug, visibility })
    .expect(201);
  return (response.body as SpaceResponse).id;
};

const createPage = async (
  testApp: TestApp,
  token: string,
  spaceId: string,
  title: string,
  parentId?: string,
  propertyValues?: Record<string, unknown>,
): Promise<PageResponse> => {
  const response = await request(testApp.getServer())
    .post(`/api/v1/spaces/${spaceId}/pages`)
    .set('Authorization', `Bearer ${token}`)
    .send({ content: plainContent(title), parentId, propertyValues, title });
  return response.body as PageResponse;
};

const defineSchema = (
  testApp: TestApp,
  token: string,
  spaceId: string,
  pageId: string,
  properties: unknown[],
  views: unknown[] = [],
) =>
  request(testApp.getServer())
    .post(`/api/v1/spaces/${spaceId}/pages/${pageId}/schema`)
    .set('Authorization', `Bearer ${token}`)
    .send({ properties, views });

const getSchema = (testApp: TestApp, token: string, spaceId: string, pageId: string) =>
  request(testApp.getServer())
    .get(`/api/v1/spaces/${spaceId}/pages/${pageId}/schema`)
    .set('Authorization', `Bearer ${token}`);

const listRows = (testApp: TestApp, token: string, spaceId: string, pageId: string) =>
  request(testApp.getServer())
    .get(`/api/v1/spaces/${spaceId}/pages/${pageId}/rows`)
    .set('Authorization', `Bearer ${token}`);

const getView = (testApp: TestApp, token: string, spaceId: string, pageId: string, viewName: string) =>
  request(testApp.getServer())
    .get(`/api/v1/spaces/${spaceId}/pages/${pageId}/views/${encodeURIComponent(viewName)}`)
    .set('Authorization', `Bearer ${token}`);

const movePage = (testApp: TestApp, token: string, spaceId: string, pageId: string, parentId: string) =>
  request(testApp.getServer())
    .patch(`/api/v1/spaces/${spaceId}/pages/${pageId}/move`)
    .set('Authorization', `Bearer ${token}`)
    .set('x-mutation-id', crypto.randomUUID())
    .send({ parentId });

const titleProperty = { key: 'title', label: 'Title', type: DatabasePropertyType.TITLE, required: true, options: null };
const statusProperty = {
  key: 'status',
  label: 'Status',
  type: DatabasePropertyType.SELECT,
  required: false,
  options: ['todo', 'done'],
};

describe('Page Schema (Integration)', () => {
  /** A collection with the status column; the ids of its options are the server's, so the tests ask for them. */
  const defineBoard = async (
    title: string,
    options: { extra?: unknown[]; spaceId?: string; token?: string; views?: unknown[] } = {},
  ) => {
    const spaceId = options.spaceId ?? sharedSpaceId;
    const token = options.token ?? adminToken;
    const collection = await createPage(testApp, token, spaceId, title);
    const defined = await defineSchema(
      testApp,
      token,
      spaceId,
      collection.id,
      [titleProperty, statusProperty, ...(options.extra ?? [])],
      options.views,
    ).expect(201);
    const schema = defined.body as PageSchemaResponse;
    return {
      collection,
      done: optionIdOf(schema, 'status', 'done'),
      schema,
      todo: optionIdOf(schema, 'status', 'todo'),
    };
  };

  let testApp: TestApp;
  let adminToken: string;
  let adminUserId: string;
  let outsiderToken: string;
  let sharedSpaceId: string;
  let secretSpaceId: string;

  beforeAll(async () => {
    testApp = await bootstrapTestApp();

    const timestamp = Date.now();
    const adminEmail = `schema-admin-${String(timestamp)}@test.com`;
    const outsiderEmail = `schema-outsider-${String(timestamp)}@test.com`;
    const password = 'plainPassword123';

    await createAccount(testApp, { email: adminEmail, name: 'Schema Admin', password });
    await createAccount(testApp, { email: outsiderEmail, name: 'Schema Outsider', password });
    await promoteToAdmin(testApp, adminEmail);

    const adminSession = await loginUser(testApp, adminEmail, password);
    const outsiderSession = await loginUser(testApp, outsiderEmail, password);
    adminToken = adminSession.accessToken;
    adminUserId = adminSession.user.id;
    outsiderToken = outsiderSession.accessToken;

    sharedSpaceId = await createSpace(
      testApp,
      adminToken,
      'Shared Schema Space',
      `shared-schema-${String(timestamp)}`,
      SpaceVisibility.PUBLIC_INTERNAL,
    );
    secretSpaceId = await createSpace(
      testApp,
      adminToken,
      'Secret Schema Space',
      `secret-schema-${String(timestamp)}`,
      SpaceVisibility.RESTRICTED,
    );
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('defining and reading a schema', () => {
    it('defines a schema of properties and views on a page and reads it back', async () => {
      const collection = await createPage(testApp, adminToken, sharedSpaceId, 'Tasks');

      const defineResponse = await defineSchema(testApp, adminToken, sharedSpaceId, collection.id, [
        titleProperty,
        statusProperty,
      ]).expect(201);
      expect((defineResponse.body as PageSchemaResponse).properties.map((property) => property.key)).toEqual([
        'title',
        'status',
      ]);

      const readResponse = await getSchema(testApp, adminToken, sharedSpaceId, collection.id).expect(200);
      const schema = readResponse.body as PageSchemaResponse;
      expect(schema.pageId).toBe(collection.id);
      expect(schema.properties.map((property) => property.key)).toEqual(['title', 'status']);
    });

    it('refuses to save a whole shape over one that changed since it was read, and keeps the newer one', async () => {
      const collection = await createPage(testApp, adminToken, sharedSpaceId, 'Concurrida');
      await defineSchema(testApp, adminToken, sharedSpaceId, collection.id, [titleProperty]).expect(201);
      const service = testApp.get(PageSchemaService);
      const workspace = await testApp.get(PrismaService).models.Workspace.select('id').all().firstOrThrow();
      const asAdmin = { pageId: collection.id, role: USER_ROLE.ADMIN, userId: adminUserId, workspaceId: workspace.id };
      const read = (await service.getSchema(collection.id, workspace.id, adminUserId, USER_ROLE.ADMIN)).getValue();
      await defineSchema(testApp, adminToken, sharedSpaceId, collection.id, [titleProperty, statusProperty]).expect(
        201,
      );

      const saved = await service.defineSchema({
        ...asAdmin,
        properties: [
          ...read.properties.map((property) => ({ ...property, twoWay: false })),
          {
            config: DEFAULT_PAGE_PROPERTY_CONFIG,
            key: 'other',
            label: 'Other',
            options: null,
            required: false,
            twoWay: false,
            type: DatabasePropertyType.RICH_TEXT,
          },
        ],
        readShape: read,
        views: read.views,
      });

      expect(saved.isFail()).toBe(true);
      expect(saved.getError().code).toBe('PAGE_SCHEMA_CHANGED');
      const kept = (await getSchema(testApp, adminToken, sharedSpaceId, collection.id).expect(200))
        .body as PageSchemaResponse;
      expect(kept.properties.map((property) => property.key)).toEqual(['title', 'status']);
    });

    it('rejects a schema definition missing its single TITLE property', async () => {
      const collection = await createPage(testApp, adminToken, sharedSpaceId, 'Bad Collection');

      await defineSchema(testApp, adminToken, sharedSpaceId, collection.id, [statusProperty]).expect(400);
    });
  });

  describe('row property validation', () => {
    it('accepts conforming property values on a row of a schema-carrying page, without duplicating the title', async () => {
      const { collection, todo } = await defineBoard('Board');

      const row = await createPage(testApp, adminToken, sharedSpaceId, 'Row A', collection.id, { status: todo });

      expect(row.propertyValues).toEqual({ status: todo });
      expect(row.propertyValues).not.toHaveProperty('title');
    });

    it('refuses the name of an option as a value, because a row holds the id', async () => {
      const { collection } = await defineBoard('Board by name');

      const response = await request(testApp.getServer())
        .post(`/api/v1/spaces/${sharedSpaceId}/pages`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          content: plainContent('Row by name'),
          parentId: collection.id,
          propertyValues: { status: 'todo' },
          title: 'Row by name',
        });

      expect(response.status).toBe(400);
    });

    it('changes one property of a row without touching what the page says', async () => {
      const { collection, done, todo } = await defineBoard('Board dragged');
      const row = await createPage(testApp, adminToken, sharedSpaceId, 'Row dragged', collection.id, {
        status: todo,
      });

      const moved = await request(testApp.getServer())
        .patch(`/api/v1/spaces/${sharedSpaceId}/pages/${row.id}/properties`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ propertyValues: { status: done } })
        .expect(200);

      expect((moved.body as PageResponse).propertyValues).toEqual({ status: done });
      expect((moved.body as PageResponse).title).toBe('Row dragged');
    });

    // Regression: reading the row, merging and saving it whole lost concurrent changes to other columns.
    it('keeps both of two property changes that arrive at the same time', async () => {
      const priorityProperty = {
        key: 'priority',
        label: 'Priority',
        options: ['low', 'high'],
        required: false,
        type: DatabasePropertyType.SELECT,
      };
      const { collection, done, schema, todo } = await defineBoard('Board at once', { extra: [priorityProperty] });
      const low = optionIdOf(schema, 'priority', 'low');
      const high = optionIdOf(schema, 'priority', 'high');
      const row = await createPage(testApp, adminToken, sharedSpaceId, 'Row at once', collection.id, {
        priority: low,
        status: todo,
      });
      const changeProperty = (propertyValues: Record<string, string>) =>
        request(testApp.getServer())
          .patch(`/api/v1/spaces/${sharedSpaceId}/pages/${row.id}/properties`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ propertyValues })
          .expect(200);

      await Promise.all([changeProperty({ status: done }), changeProperty({ priority: high })]);

      const prisma = testApp.get(PrismaService);
      const stored = await prisma.models.Block.select('properties').where({ id: row.id }).all().firstOrThrow();
      expect(stored.properties).toMatchObject({ values: { priority: high, status: done } });
    });

    it('leaves the content and the versions of the row alone when a property changes', async () => {
      const { collection, done, todo } = await defineBoard('Board untouched');
      const row = await createPage(testApp, adminToken, sharedSpaceId, 'Row untouched', collection.id, {
        status: todo,
      });
      const prisma = testApp.get(PrismaService);
      const countVersions = async (): Promise<number> =>
        (
          await prisma.models.PageVersion.where({ pageId: row.id }).aggregate((aggregation) => ({
            total: aggregation.count(),
          }))
        ).total;
      const readContent = async (): Promise<unknown> => {
        const page = await request(testApp.getServer())
          .get(`/api/v1/spaces/${sharedSpaceId}/pages/${row.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
        return (page.body as PageResponse & { content: unknown }).content;
      };
      const before = await readContent();
      const versionsBefore = await countVersions();

      await request(testApp.getServer())
        .patch(`/api/v1/spaces/${sharedSpaceId}/pages/${row.id}/properties`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ propertyValues: { status: done } })
        .expect(200);

      expect(await readContent()).toEqual(before);
      expect(await countVersions()).toBe(versionsBefore);
    });

    it('refuses to drop a row into a column the shape does not offer', async () => {
      const { collection, todo } = await defineBoard('Board refused');
      const row = await createPage(testApp, adminToken, sharedSpaceId, 'Row refused', collection.id, {
        status: todo,
      });

      await request(testApp.getServer())
        .patch(`/api/v1/spaces/${sharedSpaceId}/pages/${row.id}/properties`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ propertyValues: { status: 'inventado' } })
        .expect(400);
    });

    it('rejects property values that violate the schema', async () => {
      const collection = await createPage(testApp, adminToken, sharedSpaceId, 'Board 2');
      await defineSchema(testApp, adminToken, sharedSpaceId, collection.id, [titleProperty, statusProperty]).expect(
        201,
      );

      const response = await request(testApp.getServer())
        .post(`/api/v1/spaces/${sharedSpaceId}/pages`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          content: plainContent('Row B'),
          parentId: collection.id,
          propertyValues: { status: 'blocked' },
          title: 'Row B',
        });

      expect(response.status).toBe(400);
    });

    it('rejects any property values on a page whose parent carries no schema', async () => {
      const plainParent = await createPage(testApp, adminToken, sharedSpaceId, 'Plain Parent');

      const response = await request(testApp.getServer())
        .post(`/api/v1/spaces/${sharedSpaceId}/pages`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          content: plainContent('Plain Child'),
          parentId: plainParent.id,
          propertyValues: { status: 'todo' },
          title: 'Plain Child',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('listing rows', () => {
    it('lists the rows of a schema-carrying page, filtered by space access', async () => {
      const { collection, todo } = await defineBoard('Rows Collection');
      const row = await createPage(testApp, adminToken, sharedSpaceId, 'Visible Row', collection.id, {
        status: todo,
      });

      const asAdmin = await listRows(testApp, adminToken, sharedSpaceId, collection.id).expect(200);
      const listed = asAdmin.body as PageRowsResponse;
      expect(listed.rows.map((item) => item.id)).toEqual([row.id]);
      expect(listed.hasMore).toBe(false);
    });

    // Truncation must be reported: 500 of 600 rows without notice read as all 600.
    it('brings at most the row limit, and says the collection held more', async () => {
      const collection = await createPage(testApp, adminToken, sharedSpaceId, 'Overgrown Collection');
      await defineSchema(testApp, adminToken, sharedSpaceId, collection.id, [titleProperty]).expect(201);
      const prisma = testApp.get(PrismaService);
      const rows = Array.from({ length: COLLECTION_ROW_LIMIT + 1 }, (_unused, position) => ({
        createdById: adminUserId,
        editedById: adminUserId,
        id: crypto.randomUUID(),
        parentId: collection.id,
        properties: { title: [{ insert: `Row ${String(position)}` }] },
        spaceId: sharedSpaceId,
        type: 'page',
      }));
      await prisma.models.Block.createAndCount(rows);
      await prisma.models.Block.where({ id: collection.id }).update({ children: rows.map((row) => row.id) });

      const listed = await listRows(testApp, adminToken, sharedSpaceId, collection.id).expect(200);

      const body = listed.body as PageRowsResponse;
      expect(body.rows).toHaveLength(COLLECTION_ROW_LIMIT);
      expect(body.hasMore).toBe(true);
    });

    it('rejects listing rows of a page that does not carry a schema', async () => {
      const plainPage = await createPage(testApp, adminToken, sharedSpaceId, 'Not A Collection');

      await listRows(testApp, adminToken, sharedSpaceId, plainPage.id).expect(404);
    });

    it("hides a restricted space's rows from an outsider", async () => {
      const { collection, todo } = await defineBoard('Secret Collection', { spaceId: secretSpaceId });
      await createPage(testApp, adminToken, secretSpaceId, 'Secret Row', collection.id, { status: todo });

      await listRows(testApp, outsiderToken, secretSpaceId, collection.id).expect(403);
    });
  });

  describe('moving a row across schemas', () => {
    it('refuses a move that would leave stored values non-conforming with the destination schema, without dropping them', async () => {
      const { collection: sourceCollection, todo } = await defineBoard('Source Collection');
      const destinationCollection = await createPage(testApp, adminToken, sharedSpaceId, 'Destination Collection');
      await defineSchema(testApp, adminToken, sharedSpaceId, destinationCollection.id, [
        titleProperty,
        { key: 'priority', label: 'Priority', type: DatabasePropertyType.SELECT, required: true, options: ['low'] },
      ]).expect(201);
      const row = await createPage(testApp, adminToken, sharedSpaceId, 'Movable Row', sourceCollection.id, {
        status: todo,
      });

      await movePage(testApp, adminToken, sharedSpaceId, row.id, destinationCollection.id).expect(409);

      const rowsAfter = await listRows(testApp, adminToken, sharedSpaceId, sourceCollection.id).expect(200);
      const preserved = (rowsAfter.body as PageRowsResponse).rows.find((item) => item.id === row.id);
      expect(preserved?.propertyValues).toEqual({ status: todo });
    });

    it('refuses a move into a plain page that would silently drop the stored property values', async () => {
      const { collection: sourceCollection, todo } = await defineBoard('Source Collection 2');
      const plainDestination = await createPage(testApp, adminToken, sharedSpaceId, 'Plain Destination');
      const row = await createPage(testApp, adminToken, sharedSpaceId, 'Movable Row 2', sourceCollection.id, {
        status: todo,
      });

      await movePage(testApp, adminToken, sharedSpaceId, row.id, plainDestination.id).expect(409);

      const rowsAfter = await listRows(testApp, adminToken, sharedSpaceId, sourceCollection.id).expect(200);
      const preserved = (rowsAfter.body as PageRowsResponse).rows.find((item) => item.id === row.id);
      expect(preserved?.propertyValues).toEqual({ status: todo });
    });

    // An option is told apart by its id, which belongs to its own property: the same name in another collection is
    // another option, so the stored value does not conform there.
    it('refuses a move to a collection whose options have other ids, though their names are the same', async () => {
      const { collection: sourceCollection, todo } = await defineBoard('Source Collection 3');
      const { collection: destinationCollection } = await defineBoard('Destination Collection 3');
      const row = await createPage(testApp, adminToken, sharedSpaceId, 'Movable Row 3', sourceCollection.id, {
        status: todo,
      });

      await movePage(testApp, adminToken, sharedSpaceId, row.id, destinationCollection.id).expect(409);
    });

    it('allows a move when the row holds no value the destination could not understand', async () => {
      const sourceCollection = await createPage(testApp, adminToken, sharedSpaceId, 'Source Collection 4');
      await defineSchema(testApp, adminToken, sharedSpaceId, sourceCollection.id, [titleProperty]).expect(201);
      const { collection: destinationCollection } = await defineBoard('Destination Collection 4');
      const row = await createPage(testApp, adminToken, sharedSpaceId, 'Movable Row 4', sourceCollection.id, {});

      await movePage(testApp, adminToken, sharedSpaceId, row.id, destinationCollection.id).expect(200);
    });
  });

  describe('reading views', () => {
    it('returns the rows of a table view in order', async () => {
      const { collection, done, todo } = await defineBoard('Table Collection', {
        views: [{ name: 'Table', type: DatabaseViewType.TABLE, configuration: {}, isDefault: true }],
      });
      const first = await createPage(testApp, adminToken, sharedSpaceId, 'First', collection.id, { status: todo });
      const second = await createPage(testApp, adminToken, sharedSpaceId, 'Second', collection.id, {
        status: done,
      });

      const response = await getView(testApp, adminToken, sharedSpaceId, collection.id, 'Table').expect(200);

      const body = response.body as {
        outcome: { kind: string; rows: PageResponse[] };
        rowCount: number;
        totalRowCount: number;
      };
      expect(body.outcome.kind).toBe('FLAT_ROWS');
      expect(body.outcome.rows.map((row) => row.id)).toEqual([first.id, second.id]);
      expect(body).toMatchObject({ rowCount: 2, totalRowCount: 2 });
    });

    it('groups the rows of a board view into columns by the configured select property', async () => {
      const { collection, done, todo } = await defineBoard('Board Collection', {
        views: [{ name: 'Board', type: DatabaseViewType.BOARD, configuration: { groupBy: 'status' }, isDefault: true }],
      });
      const todoRow = await createPage(testApp, adminToken, sharedSpaceId, 'Todo Row', collection.id, {
        status: todo,
      });

      const response = await getView(testApp, adminToken, sharedSpaceId, collection.id, 'Board').expect(200);

      const body = response.body as {
        outcome: { kind: string; groups: { key: string; rows: PageResponse[] }[] };
      };
      expect(body.outcome.kind).toBe('GROUPED_ROWS');
      expect(body.outcome.groups.map((group) => group.key)).toEqual([todo, done, 'unassigned']);
      expect(body.outcome.groups.find((group) => group.key === todo)?.rows.map((row) => row.id)).toEqual([todoRow.id]);
    });

    it('signals a missing grouping property instead of an empty board when the schema no longer has it', async () => {
      const collection = await createPage(testApp, adminToken, sharedSpaceId, 'Stale Board Collection');
      await defineSchema(
        testApp,
        adminToken,
        sharedSpaceId,
        collection.id,
        [titleProperty, statusProperty],
        [{ name: 'Board', type: DatabaseViewType.BOARD, configuration: { groupBy: 'status' }, isDefault: true }],
      ).expect(201);

      const prisma = testApp.get(PrismaService);
      await prisma.models.PageSchemaProperty.where({ key: 'status', pageId: collection.id }).deleteAndCount();

      const response = await getView(testApp, adminToken, sharedSpaceId, collection.id, 'Board').expect(200);
      expect(response.body).toEqual({
        attachedFiles: [],
        hasMore: false,
        outcome: { kind: 'MISSING_GROUPING_PROPERTY' },
        relatedRows: [],
        rowCount: 0,
        totalRowCount: 0,
      });
    });

    it('returns 404 for a view name that does not exist on the schema', async () => {
      const collection = await createPage(testApp, adminToken, sharedSpaceId, 'No Views Collection');
      await defineSchema(testApp, adminToken, sharedSpaceId, collection.id, [titleProperty, statusProperty]).expect(
        201,
      );

      await getView(testApp, adminToken, sharedSpaceId, collection.id, 'Nonexistent').expect(404);
    });

    it("hides a restricted space's view from an outsider", async () => {
      const collection = await createPage(testApp, adminToken, secretSpaceId, 'Secret View Collection');
      await defineSchema(
        testApp,
        adminToken,
        secretSpaceId,
        collection.id,
        [titleProperty, statusProperty],
        [{ name: 'Table', type: DatabaseViewType.TABLE, configuration: {}, isDefault: true }],
      ).expect(201);

      await getView(testApp, outsiderToken, secretSpaceId, collection.id, 'Table').expect(403);
    });
  });

  describe('lo asignado a una persona', () => {
    const ownerProperty = {
      key: 'owner',
      label: 'Owner',
      options: null,
      required: false,
      type: DatabasePropertyType.PERSON,
    };

    it('lists the rows of every collection that name the person in a column of people', async () => {
      const tasks = await createPage(testApp, adminToken, sharedSpaceId, 'Tareas asignables');
      const bugs = await createPage(testApp, adminToken, sharedSpaceId, 'Errores asignables');
      await defineSchema(testApp, adminToken, sharedSpaceId, tasks.id, [titleProperty, ownerProperty]).expect(201);
      await defineSchema(testApp, adminToken, sharedSpaceId, bugs.id, [titleProperty, ownerProperty]).expect(201);
      const mine = await createPage(testApp, adminToken, sharedSpaceId, 'Mía', tasks.id, { owner: [adminUserId] });
      const alsoMine = await createPage(testApp, adminToken, sharedSpaceId, 'También mía', bugs.id, {
        owner: [adminUserId],
      });
      await createPage(testApp, adminToken, sharedSpaceId, 'De nadie', tasks.id, {});

      const response = await request(testApp.getServer())
        .get('/api/v1/pages/assigned')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const ids = (response.body as PageResponse[]).map((page) => page.id);
      expect(ids).toContain(mine.id);
      expect(ids).toContain(alsoMine.id);
      expect(ids.filter((id) => id === mine.id || id === alsoMine.id)).toHaveLength(2);
    });
  });
});
