import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { DatabasePropertyType, DatabaseViewType, SpaceVisibility } from '@company-brain/db';
import type { PageContent } from '@company-brain/shared';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { loginUser, registerUser } from '../helpers/auth.helper';
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

interface PageSchemaResponse {
  pageId: string;
  properties: { key: string; type: string }[];
  views: unknown[];
}

const plainContent = (text: string): PageContent => ({
  content: [{ content: [{ text, type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
});

const promoteToAdmin = async (testApp: TestApp, email: string): Promise<void> => {
  const prisma = testApp.get(PrismaService);
  await prisma.user.update({ data: { role: 'ADMIN' }, where: { email } });
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
  let testApp: TestApp;
  let adminToken: string;
  let outsiderToken: string;
  let sharedSpaceId: string;
  let secretSpaceId: string;

  beforeAll(async () => {
    testApp = await bootstrapTestApp();

    const timestamp = Date.now();
    const adminEmail = `schema-admin-${String(timestamp)}@test.com`;
    const outsiderEmail = `schema-outsider-${String(timestamp)}@test.com`;
    const password = 'plainPassword123';

    await registerUser(testApp, { email: adminEmail, name: 'Schema Admin', password });
    await registerUser(testApp, { email: outsiderEmail, name: 'Schema Outsider', password });
    await promoteToAdmin(testApp, adminEmail);

    const adminSession = await loginUser(testApp, adminEmail, password);
    const outsiderSession = await loginUser(testApp, outsiderEmail, password);
    adminToken = adminSession.accessToken;
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

    it('rejects a schema definition missing its single TITLE property', async () => {
      const collection = await createPage(testApp, adminToken, sharedSpaceId, 'Bad Collection');

      await defineSchema(testApp, adminToken, sharedSpaceId, collection.id, [statusProperty]).expect(400);
    });
  });

  describe('row property validation', () => {
    it('accepts conforming property values on a row of a schema-carrying page, without duplicating the title', async () => {
      const collection = await createPage(testApp, adminToken, sharedSpaceId, 'Board');
      await defineSchema(testApp, adminToken, sharedSpaceId, collection.id, [titleProperty, statusProperty]).expect(
        201,
      );

      const row = await createPage(testApp, adminToken, sharedSpaceId, 'Row A', collection.id, { status: 'todo' });

      expect(row.propertyValues).toEqual({ status: 'todo' });
      expect(row.propertyValues).not.toHaveProperty('title');
    });

    /** What a card dragged across a board does: one value moves and the rest of the page is left alone. */
    it('changes one property of a row without touching what the page says', async () => {
      const collection = await createPage(testApp, adminToken, sharedSpaceId, 'Board dragged');
      await defineSchema(testApp, adminToken, sharedSpaceId, collection.id, [titleProperty, statusProperty]).expect(
        201,
      );
      const row = await createPage(testApp, adminToken, sharedSpaceId, 'Row dragged', collection.id, {
        status: 'todo',
      });

      const moved = await request(testApp.getServer())
        .patch(`/api/v1/spaces/${sharedSpaceId}/pages/${row.id}/properties`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ propertyValues: { status: 'done' } })
        .expect(200);

      expect((moved.body as PageResponse).propertyValues).toEqual({ status: 'done' });
      expect((moved.body as PageResponse).title).toBe('Row dragged');
    });

    it('refuses to drop a row into a column the shape does not offer', async () => {
      const collection = await createPage(testApp, adminToken, sharedSpaceId, 'Board refused');
      await defineSchema(testApp, adminToken, sharedSpaceId, collection.id, [titleProperty, statusProperty]).expect(
        201,
      );
      const row = await createPage(testApp, adminToken, sharedSpaceId, 'Row refused', collection.id, {
        status: 'todo',
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
      const collection = await createPage(testApp, adminToken, sharedSpaceId, 'Rows Collection');
      await defineSchema(testApp, adminToken, sharedSpaceId, collection.id, [titleProperty, statusProperty]).expect(
        201,
      );
      const row = await createPage(testApp, adminToken, sharedSpaceId, 'Visible Row', collection.id, {
        status: 'todo',
      });

      const asAdmin = await listRows(testApp, adminToken, sharedSpaceId, collection.id).expect(200);
      expect((asAdmin.body as PageResponse[]).map((item) => item.id)).toEqual([row.id]);
    });

    it('rejects listing rows of a page that does not carry a schema', async () => {
      const plainPage = await createPage(testApp, adminToken, sharedSpaceId, 'Not A Collection');

      await listRows(testApp, adminToken, sharedSpaceId, plainPage.id).expect(404);
    });

    it("hides a restricted space's rows from an outsider", async () => {
      const collection = await createPage(testApp, adminToken, secretSpaceId, 'Secret Collection');
      await defineSchema(testApp, adminToken, secretSpaceId, collection.id, [titleProperty, statusProperty]).expect(
        201,
      );
      await createPage(testApp, adminToken, secretSpaceId, 'Secret Row', collection.id, { status: 'todo' });

      await listRows(testApp, outsiderToken, secretSpaceId, collection.id).expect(403);
    });
  });

  describe('moving a row across schemas', () => {
    it('refuses a move that would leave stored values non-conforming with the destination schema, without dropping them', async () => {
      const sourceCollection = await createPage(testApp, adminToken, sharedSpaceId, 'Source Collection');
      await defineSchema(testApp, adminToken, sharedSpaceId, sourceCollection.id, [
        titleProperty,
        statusProperty,
      ]).expect(201);
      const destinationCollection = await createPage(testApp, adminToken, sharedSpaceId, 'Destination Collection');
      await defineSchema(testApp, adminToken, sharedSpaceId, destinationCollection.id, [
        titleProperty,
        { key: 'priority', label: 'Priority', type: DatabasePropertyType.SELECT, required: true, options: ['low'] },
      ]).expect(201);
      const row = await createPage(testApp, adminToken, sharedSpaceId, 'Movable Row', sourceCollection.id, {
        status: 'todo',
      });

      await movePage(testApp, adminToken, sharedSpaceId, row.id, destinationCollection.id).expect(409);

      const rowsAfter = await listRows(testApp, adminToken, sharedSpaceId, sourceCollection.id).expect(200);
      const preserved = (rowsAfter.body as PageResponse[]).find((item) => item.id === row.id);
      expect(preserved?.propertyValues).toEqual({ status: 'todo' });
    });

    it('refuses a move into a plain page that would silently drop the stored property values', async () => {
      const sourceCollection = await createPage(testApp, adminToken, sharedSpaceId, 'Source Collection 2');
      await defineSchema(testApp, adminToken, sharedSpaceId, sourceCollection.id, [
        titleProperty,
        statusProperty,
      ]).expect(201);
      const plainDestination = await createPage(testApp, adminToken, sharedSpaceId, 'Plain Destination');
      const row = await createPage(testApp, adminToken, sharedSpaceId, 'Movable Row 2', sourceCollection.id, {
        status: 'todo',
      });

      await movePage(testApp, adminToken, sharedSpaceId, row.id, plainDestination.id).expect(409);

      const rowsAfter = await listRows(testApp, adminToken, sharedSpaceId, sourceCollection.id).expect(200);
      const preserved = (rowsAfter.body as PageResponse[]).find((item) => item.id === row.id);
      expect(preserved?.propertyValues).toEqual({ status: 'todo' });
    });

    it('allows a move when the destination schema still accepts the stored values', async () => {
      const sourceCollection = await createPage(testApp, adminToken, sharedSpaceId, 'Source Collection 3');
      await defineSchema(testApp, adminToken, sharedSpaceId, sourceCollection.id, [
        titleProperty,
        statusProperty,
      ]).expect(201);
      const destinationCollection = await createPage(testApp, adminToken, sharedSpaceId, 'Destination Collection 3');
      await defineSchema(testApp, adminToken, sharedSpaceId, destinationCollection.id, [
        titleProperty,
        statusProperty,
      ]).expect(201);
      const row = await createPage(testApp, adminToken, sharedSpaceId, 'Movable Row 3', sourceCollection.id, {
        status: 'todo',
      });

      await movePage(testApp, adminToken, sharedSpaceId, row.id, destinationCollection.id).expect(200);

      const rowsAfter = await listRows(testApp, adminToken, sharedSpaceId, destinationCollection.id).expect(200);
      const moved = (rowsAfter.body as PageResponse[]).find((item) => item.id === row.id);
      expect(moved?.propertyValues).toEqual({ status: 'todo' });
    });
  });

  describe('reading views', () => {
    it('returns the rows of a table view in order', async () => {
      const collection = await createPage(testApp, adminToken, sharedSpaceId, 'Table Collection');
      await defineSchema(
        testApp,
        adminToken,
        sharedSpaceId,
        collection.id,
        [titleProperty, statusProperty],
        [{ name: 'Table', type: DatabaseViewType.TABLE, configuration: {}, isDefault: true }],
      ).expect(201);
      const first = await createPage(testApp, adminToken, sharedSpaceId, 'First', collection.id, { status: 'todo' });
      const second = await createPage(testApp, adminToken, sharedSpaceId, 'Second', collection.id, {
        status: 'done',
      });

      const response = await getView(testApp, adminToken, sharedSpaceId, collection.id, 'Table').expect(200);

      const body = response.body as {
        outcome: { kind: string; rows: PageResponse[] };
        rowCount: number;
        totalRowCount: number;
      };
      expect(body.outcome.kind).toBe('FLAT_ROWS');
      expect(body.outcome.rows.map((row) => row.id)).toEqual([first.id, second.id]);
      /** Cuántas se ven de cuántas hay: sin filtro puesto, las mismas. */
      expect(body).toMatchObject({ rowCount: 2, totalRowCount: 2 });
    });

    it('groups the rows of a board view into columns by the configured select property', async () => {
      const collection = await createPage(testApp, adminToken, sharedSpaceId, 'Board Collection');
      await defineSchema(
        testApp,
        adminToken,
        sharedSpaceId,
        collection.id,
        [titleProperty, statusProperty],
        [{ name: 'Board', type: DatabaseViewType.BOARD, configuration: { groupBy: 'status' }, isDefault: true }],
      ).expect(201);
      const todoRow = await createPage(testApp, adminToken, sharedSpaceId, 'Todo Row', collection.id, {
        status: 'todo',
      });

      const response = await getView(testApp, adminToken, sharedSpaceId, collection.id, 'Board').expect(200);

      const body = response.body as {
        outcome: { kind: string; groups: { key: string; rows: PageResponse[] }[] };
      };
      expect(body.outcome.kind).toBe('GROUPED_ROWS');
      expect(body.outcome.groups.map((group) => group.key)).toEqual(['todo', 'done', 'unassigned']);
      expect(body.outcome.groups.find((group) => group.key === 'todo')?.rows.map((row) => row.id)).toEqual([
        todoRow.id,
      ]);
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
      await prisma.pageSchemaProperty.deleteMany({ where: { key: 'status', pageId: collection.id } });

      const response = await getView(testApp, adminToken, sharedSpaceId, collection.id, 'Board').expect(200);
      expect(response.body).toEqual({
        outcome: { kind: 'MISSING_GROUPING_PROPERTY' },
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
});
