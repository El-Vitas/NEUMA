import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { DatabasePropertyType, DatabaseViewType, SpaceVisibility } from '@neuma/db';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface TemplateSummary {
  id: string;
  isDefault: boolean;
  propertyValues: Record<string, unknown>;
  title: string;
  variables: Record<string, string>;
}

interface TemplateListing {
  defaultTemplateId: string | null;
  templates: TemplateSummary[];
}

interface PageBody {
  content: unknown;
  id: string;
  propertyValues: Record<string, unknown> | null;
  title: string;
}

const PASSWORD = 'plainPassword123';
const TITLE = { key: 'title', label: 'Title', options: null, required: true, type: DatabasePropertyType.TITLE };
const PROPERTIES = [
  TITLE,
  { key: 'status', label: 'Status', options: null, required: false, type: DatabasePropertyType.STATUS },
  { key: 'points', label: 'Points', options: null, required: false, type: DatabasePropertyType.NUMBER },
  {
    config: { allowsMultiple: true },
    key: 'owner',
    label: 'Owner',
    options: null,
    required: false,
    type: DatabasePropertyType.PERSON,
  },
  { key: 'due', label: 'Due', options: null, required: false, type: DatabasePropertyType.DATE },
];

const paragraph = (text: string) => ({
  content: [{ content: [{ text, type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
});
const BLANK = { content: [{ content: [], type: 'paragraph' }], schemaVersion: 1, type: 'doc' };

const listBlockIds = (content: unknown): string[] =>
  [...JSON.stringify(content).matchAll(/"id":"([^"]+)"/g)].map((match) => match[1] ?? '');

describe('Templates of a collection (Integration)', () => {
  let testApp: TestApp;
  let adminToken: string;
  let adminId: string;
  let workerToken: string;
  let spaceId: string;
  let collectionId: string;

  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const api = () => request(testApp.getServer());
  const pagesUrl = () => `/api/v1/spaces/${spaceId}/pages`;
  const templatesUrl = () => `${pagesUrl()}/${collectionId}/templates`;

  const createTemplate = async (body: Record<string, unknown>, token = adminToken): Promise<TemplateSummary> =>
    (await api().post(templatesUrl()).set(as(token)).send(body).expect(201)).body as TemplateSummary;

  const listTemplates = async (token = adminToken): Promise<TemplateListing> =>
    (await api().get(templatesUrl()).set(as(token)).expect(200)).body as TemplateListing;

  const createRow = async (body: Record<string, unknown>, token = adminToken): Promise<PageBody> =>
    (
      await api()
        .post(pagesUrl())
        .set(as(token))
        .send({ content: BLANK, parentId: collectionId, title: '', ...body })
        .expect(201)
    ).body as PageBody;

  const readRow = async (rowId: string): Promise<PageBody> =>
    (await api().get(`${pagesUrl()}/${rowId}`).set(as(adminToken)).expect(200)).body as PageBody;

  const setDefault = async (templateId: string | null): Promise<void> => {
    await api().put(`${templatesUrl()}/default`).set(as(adminToken)).send({ templateId }).expect(200);
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    const prisma = testApp.get(PrismaService);
    const stamp = String(Date.now());
    const adminEmail = `templates-admin-${stamp}@test.com`;
    const workerEmail = `templates-worker-${stamp}@test.com`;
    await createAccount(testApp, { email: adminEmail, name: 'Templates Admin', password: PASSWORD });
    await createAccount(testApp, { email: workerEmail, name: 'Templates Worker', password: PASSWORD });
    await prisma.models.User.where({ email: adminEmail }).update({ role: 'ADMIN' });
    await prisma.models.User.where({ email: workerEmail }).update({ role: 'CLIENT' });
    const admin = await loginUser(testApp, adminEmail, PASSWORD);
    adminToken = admin.accessToken;
    adminId = admin.user.id;
    workerToken = (await loginUser(testApp, workerEmail, PASSWORD)).accessToken;
    const space = await api()
      .post('/api/v1/spaces')
      .set(as(adminToken))
      .send({ name: 'Templates', slug: `templates-${stamp}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(201);
    spaceId = (space.body as { id: string }).id;
    const workspaceId = (await prisma.models.Space.where({ id: spaceId }).first())?.workspaceId ?? '';
    const worker = await loginUser(testApp, workerEmail, PASSWORD);
    await prisma.models.WorkspaceMember.createAndCount([{ role: 'CLIENT', userId: worker.user.id, workspaceId }], {
      onConflict: 'skip',
    });
    const page = await api().post(pagesUrl()).set(as(adminToken)).send({ content: BLANK, title: 'Work' }).expect(201);
    collectionId = (page.body as { id: string }).id;
    await api()
      .post(`${pagesUrl()}/${collectionId}/schema`)
      .set(as(adminToken))
      .send({
        properties: PROPERTIES,
        views: [{ configuration: {}, isDefault: true, name: 'Table', type: DatabaseViewType.TABLE }],
      })
      .expect(201);
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('managing templates', () => {
    it('creates a template with content, values and variables, and lists it', async () => {
      const created = await createTemplate({
        content: paragraph('Agenda item one'),
        propertyValues: { points: 5 },
        title: 'Weekly sync',
        variables: { due: '@today', owner: '@me' },
      });

      const listing = await listTemplates();

      expect(created.isDefault).toBe(false);
      expect(listing.templates.map((template) => template.title)).toContain('Weekly sync');
      const stored = listing.templates.find((template) => template.id === created.id);
      expect(stored?.propertyValues).toEqual({ points: 5 });
      expect(stored?.variables).toEqual({ due: '@today', owner: '@me' });
    });

    it('refuses a variable that does not fit its column', async () => {
      await api()
        .post(templatesUrl())
        .set(as(adminToken))
        .send({ content: BLANK, title: 'Wrong', variables: { owner: '@today' } })
        .expect(400);
    });

    it('renames a template, changes its values and its variables', async () => {
      const created = await createTemplate({ content: BLANK, title: 'Before' });

      await api()
        .patch(`${templatesUrl()}/${created.id}`)
        .set(as(adminToken))
        .send({ propertyValues: { points: 9 }, title: 'After', variables: { due: '@today' } })
        .expect(200);

      const stored = (await listTemplates()).templates.find((template) => template.id === created.id);
      expect(stored?.title).toBe('After');
      expect(stored?.propertyValues).toEqual({ points: 9 });
      expect(stored?.variables).toEqual({ due: '@today' });
    });

    it('keeps one default at a time and clears it when that template is deleted', async () => {
      const first = await createTemplate({ content: BLANK, title: 'First default' });
      const second = await createTemplate({ content: BLANK, title: 'Second default' });

      await setDefault(first.id);
      await setDefault(second.id);
      const afterSwitch = await listTemplates();
      await api().delete(`${templatesUrl()}/${second.id}`).set(as(adminToken)).expect(200);
      const afterDelete = await listTemplates();

      expect(afterSwitch.defaultTemplateId).toBe(second.id);
      expect(afterSwitch.templates.filter((template) => template.isDefault).map((template) => template.id)).toEqual([
        second.id,
      ]);
      expect(afterDelete.defaultTemplateId).toBeNull();
      expect(afterDelete.templates.map((template) => template.id)).not.toContain(second.id);
    });

    it('puts a deleted template in the trash as a template, and restoring it brings it back without the default', async () => {
      const template = await createTemplate({ content: paragraph('Recoverable'), isDefault: true, title: 'Oops' });
      await api().delete(`${templatesUrl()}/${template.id}`).set(as(adminToken)).expect(200);

      const trash = (await api().get(`/api/v1/pages/trash?spaceId=${spaceId}`).set(as(adminToken)).expect(200))
        .body as { id: string; isTemplate: boolean; parentId: string | null; purgeAfter: string | null }[];
      const trashed = trash.find((entry) => entry.id === template.id);
      const whileTrashed = await listTemplates();
      await api()
        .post(`${pagesUrl()}/${template.id}/restore`)
        .set(as(adminToken))
        .set('x-mutation-id', crypto.randomUUID())
        .send({})
        .expect(201);
      const restored = await listTemplates();

      expect(trashed?.isTemplate).toBe(true);
      expect(trashed?.parentId).toBe(collectionId);
      expect(trashed?.purgeAfter).toBeNull();
      expect(whileTrashed.templates.map((entry) => entry.id)).not.toContain(template.id);
      expect(restored.templates.map((entry) => entry.id)).toContain(template.id);
      expect(restored.defaultTemplateId).toBeNull();
    });

    it('marks an ordinary trashed row as no template', async () => {
      const row = await createRow({ title: 'Plain trashed' });
      await api()
        .post(`${pagesUrl()}/${row.id}/trash`)
        .set(as(adminToken))
        .set('x-mutation-id', crypto.randomUUID())
        .send({})
        .expect(201);

      const trash = (await api().get(`/api/v1/pages/trash?spaceId=${spaceId}`).set(as(adminToken)).expect(200))
        .body as { id: string; isTemplate: boolean }[];

      expect(trash.find((entry) => entry.id === row.id)?.isTemplate).toBe(false);
    });

    it('refuses someone who cannot edit the collection', async () => {
      await api().post(templatesUrl()).set(as(workerToken)).send({ content: BLANK, title: 'Nope' }).expect(403);
    });
  });

  describe('making a row from a template', () => {
    it('copies content and values with new ids and resolves today and me', async () => {
      const template = await createTemplate({
        content: paragraph('Agenda copied'),
        propertyValues: { points: 3 },
        title: 'Copy source',
        variables: { due: '@today', owner: '@me' },
      });

      const row = await createRow({ templateId: template.id, timeZone: 'UTC', title: 'Row from template' });

      const stored = await readRow(row.id);
      const today = new Date().toISOString().slice(0, 10);
      expect(stored.title).toBe('Row from template');
      expect(stored.propertyValues?.points).toBe(3);
      expect(stored.propertyValues?.owner).toEqual([adminId]);
      expect(stored.propertyValues?.due).toEqual({ start: today });
      expect(JSON.stringify(stored.content)).toContain('Agenda copied');
      const source = await readRow(template.id);
      const sourceIds = new Set(listBlockIds(source.content));
      expect(listBlockIds(stored.content).filter((id) => sourceIds.has(id))).toEqual([]);
      expect(JSON.stringify(source.content)).toContain('Agenda copied');
    });

    it('lets the given values win and the template fill the rest', async () => {
      const template = await createTemplate({
        content: BLANK,
        propertyValues: { points: 3 },
        title: 'Fill the rest',
        variables: { owner: '@me' },
      });

      const row = await createRow({ propertyValues: { points: 8 }, templateId: template.id, title: 'Given wins' });

      const stored = await readRow(row.id);
      expect(stored.propertyValues?.points).toBe(8);
      expect(stored.propertyValues?.owner).toEqual([adminId]);
    });

    it('puts the defaults of the columns under the template and under what is given', async () => {
      const template = await createTemplate({ content: BLANK, propertyValues: { points: 3 }, title: 'Over defaults' });

      const fromTemplate = await createRow({ defaultValues: { points: 1 }, templateId: template.id, title: 'A' });
      const fromGiven = await createRow({
        defaultValues: { points: 1 },
        propertyValues: { points: 8 },
        templateId: template.id,
        title: 'B',
      });
      const withoutTemplate = await createRow({ defaultValues: { points: 1 }, templateId: null, title: 'C' });

      expect((await readRow(fromTemplate.id)).propertyValues?.points).toBe(3);
      expect((await readRow(fromGiven.id)).propertyValues?.points).toBe(8);
      expect((await readRow(withoutTemplate.id)).propertyValues?.points).toBe(1);
    });

    it('takes the title of the template when the row has none, and the given content when it has some', async () => {
      const template = await createTemplate({
        content: paragraph('From the template'),
        title: 'Title source',
      });

      const untitled = await createRow({ templateId: template.id });
      const written = await createRow({ content: paragraph('Written by hand'), templateId: template.id, title: 'T' });

      expect((await readRow(untitled.id)).title).toBe('Title source');
      expect(JSON.stringify((await readRow(written.id)).content)).toContain('Written by hand');
      expect(JSON.stringify((await readRow(written.id)).content)).not.toContain('From the template');
    });

    it('uses the default template when none is named, and none when it is asked to', async () => {
      const template = await createTemplate({
        content: paragraph('Default body'),
        propertyValues: { points: 1 },
        title: 'The default',
      });
      await setDefault(template.id);

      const withDefault = await createRow({ title: 'Gets default' });
      const withNone = await createRow({ templateId: null, title: 'Gets none' });
      await setDefault(null);
      const afterClearing = await createRow({ title: 'After clearing' });

      expect((await readRow(withDefault.id)).propertyValues?.points).toBe(1);
      expect(JSON.stringify((await readRow(withDefault.id)).content)).toContain('Default body');
      expect((await readRow(withNone.id)).propertyValues?.points).toBeUndefined();
      expect((await readRow(afterClearing.id)).propertyValues?.points).toBeUndefined();
    });

    it('refuses a template of another collection and a row that is not a template', async () => {
      const row = await createRow({ title: 'Plain row' });

      await api()
        .post(pagesUrl())
        .set(as(adminToken))
        .send({ content: BLANK, parentId: collectionId, templateId: row.id, title: 'x' })
        .expect(404);
    });
  });

  describe('duplicating the collection', () => {
    it('carries its templates and points the default at the copy of its own template', async () => {
      const original = await createTemplate({ content: paragraph('Carried along'), title: 'Carried', isDefault: true });

      const copy = (
        await api()
          .post(`${pagesUrl()}/${collectionId}/duplicate`)
          .set(as(adminToken))
          .send({ includeChildren: true, title: 'Work copy' })
          .expect(201)
      ).body as { id: string };

      const copied = (await api().get(`${pagesUrl()}/${copy.id}/templates`).set(as(adminToken)).expect(200))
        .body as TemplateListing;
      const carried = copied.templates.find((template) => template.title === 'Carried');
      expect(carried).toBeDefined();
      expect(carried?.id).not.toBe(original.id);
      expect(copied.defaultTemplateId).toBe(carried?.id ?? null);
      const rows = (
        await api()
          .post(`${pagesUrl()}/${copy.id}/query`)
          .set(as(adminToken))
          .send({ reducers: [{ id: 'rows', kind: 'results', limit: 100 }] })
      ).body as { reducers?: { rows?: { ids: string[] } } };
      expect(rows.reducers?.rows?.ids ?? []).not.toContain(carried?.id ?? '');
    });
  });

  describe('a template is never a row', () => {
    it('stays out of queries, counts, changes, search, the page list and the trash', async () => {
      const word = `Quokkafish${String(Date.now())}`;
      const template = await createTemplate({ content: paragraph(`${word} inside`), title: `${word} template` });
      const row = await createRow({ title: 'Neighbor row' });

      const queried = (
        await api()
          .post(`${pagesUrl()}/${collectionId}/query`)
          .set(as(adminToken))
          .send({
            reducers: [
              { id: 'rows', kind: 'results', limit: 100 },
              {
                by: 'NONE',
                id: 'counts',
                items: [{ calculation: 'COUNT_ALL', id: 'all', propertyKey: null }],
                kind: 'aggregations',
              },
            ],
          })
          .expect(200)
      ).body as {
        reducers: { counts: { totals: { all: number } }; rows: { ids: string[] } };
      };
      const changes = (
        await api().post(`${pagesUrl()}/${collectionId}/changes`).set(as(adminToken)).send({}).expect(200)
      ).body as { total: number };
      const search = (
        await api()
          .get(`/api/v1/search?query=${encodeURIComponent(word)}`)
          .set(as(adminToken))
          .expect(200)
      ).body as { items: { sourceId: string }[] };
      const listed = (await api().get(pagesUrl()).set(as(adminToken)).expect(200)).body as { id: string }[];
      const trash = (await api().get('/api/v1/pages/trash').set(as(adminToken)).expect(200)).body as unknown;
      const schema = (await api().get(`${pagesUrl()}/${collectionId}/schema`).set(as(adminToken)).expect(200)).body as {
        rowCount?: number;
      };

      expect(queried.reducers.rows.ids).toContain(row.id);
      expect(queried.reducers.rows.ids).not.toContain(template.id);
      const rowsOnly = queried.reducers.rows.ids.length;
      expect(queried.reducers.counts.totals.all).toBe(rowsOnly);
      expect(changes.total).toBe(rowsOnly);
      expect(search.items.map((item) => item.sourceId)).not.toContain(template.id);
      expect(search.items).toEqual([]);
      expect(listed.map((page) => page.id)).not.toContain(template.id);
      expect(JSON.stringify(trash)).not.toContain(template.id);
      if (schema.rowCount !== undefined) expect(schema.rowCount).toBe(rowsOnly);
    });
  });
});
