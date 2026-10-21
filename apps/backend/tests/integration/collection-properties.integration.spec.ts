import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { DatabasePropertyType, SpaceVisibility } from '@neuma/db';
import type { PageContent } from '@neuma/shared';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface PageResponse {
  id: string;
  propertyValues: Record<string, unknown> | null;
}

interface SchemaProperty {
  config?: Record<string, unknown> | null;
  key: string;
  options?: { group?: string; id: string; value: string }[] | null;
  type: string;
}

interface SchemaResponse {
  properties: SchemaProperty[];
}

interface RowsResponse {
  relatedRows: { id: string; title: string }[];
  rows: PageResponse[];
}

interface Outcome {
  error?: { code: string; details?: unknown };
  id: string;
}

const PASSWORD = 'plainPassword123';

const plainContent = (text: string): PageContent => ({
  content: [{ content: [{ text, type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
});

const title = { key: 'title', label: 'Title', options: null, required: true, type: DatabasePropertyType.TITLE };

describe('Collection property types (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let adminToken: string;
  let adminId: string;
  let workerToken: string;
  let spaceId: string;

  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  const createPage = async (name: string, parentId?: string, propertyValues?: Record<string, unknown>) => {
    const response = await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set(as(adminToken))
      .send({ content: plainContent(name), parentId, propertyValues, title: name });
    return response;
  };

  const createRow = async (name: string, parentId: string, propertyValues?: Record<string, unknown>) => {
    const response = await createPage(name, parentId, propertyValues);
    expect(response.status).toBe(201);
    return response.body as PageResponse;
  };

  const define = (pageId: string, properties: unknown[], token = adminToken) =>
    request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages/${pageId}/schema`)
      .set(as(token))
      .send({ properties, views: [] });

  const createCollection = async (name: string, properties: unknown[]) => {
    const page = await createPage(name);
    const collection = page.body as PageResponse;
    const defined = await define(collection.id, [title, ...properties]).expect(201);
    return { collection, schema: defined.body as SchemaResponse };
  };

  const readSchema = async (pageId: string): Promise<SchemaResponse> =>
    (
      await request(testApp.getServer())
        .get(`/api/v1/spaces/${spaceId}/pages/${pageId}/schema`)
        .set(as(adminToken))
        .expect(200)
    ).body as SchemaResponse;

  const listRows = async (pageId: string, token = adminToken): Promise<RowsResponse> =>
    (
      await request(testApp.getServer())
        .get(`/api/v1/spaces/${spaceId}/pages/${pageId}/rows`)
        .set(as(token))
        .expect(200)
    ).body as RowsResponse;

  const patchValues = (rowId: string, propertyValues: Record<string, unknown>) =>
    request(testApp.getServer())
      .patch(`/api/v1/spaces/${spaceId}/pages/${rowId}/properties`)
      .set(as(adminToken))
      .send({ propertyValues });

  const optionOf = (schema: SchemaResponse, key: string, name: string) => {
    const option = schema.properties.find((property) => property.key === key)?.options?.find((o) => o.value === name);
    if (option === undefined) throw new Error(`No option ${name} in ${key}`);
    return option;
  };

  const transact = async (token: string, operations: unknown[]): Promise<Outcome> => {
    const response = await request(testApp.getServer())
      .post('/api/v1/transactions')
      .set(as(token))
      .send({ transactions: [{ id: crypto.randomUUID(), operations, spaceId }] })
      .expect(200);
    return (response.body as { transactions: Outcome[] }).transactions[0] as Outcome;
  };

  const relationOp = (
    command: 'addRelation' | 'removeRelation',
    rowId: string,
    property: string,
    targetId: string,
  ) => ({
    args: { property, targetId },
    command,
    path: [],
    pointer: { id: rowId, table: 'block' },
  });

  const storedValues = async (rowId: string): Promise<Record<string, unknown>> => {
    const block = await prisma.models.Block.select('properties').where({ id: rowId }).first();
    const properties = block?.properties as { values?: Record<string, unknown> } | undefined;
    return properties?.values ?? {};
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    const stamp = String(Date.now());
    const adminEmail = `props-admin-${stamp}@test.com`;
    const workerEmail = `props-worker-${stamp}@test.com`;
    await createAccount(testApp, { email: adminEmail, name: 'Props Admin', password: PASSWORD });
    await createAccount(testApp, { email: workerEmail, name: 'Props Worker', password: PASSWORD });
    await prisma.models.User.where({ email: adminEmail }).update({ role: 'ADMIN' });
    await prisma.models.User.where({ email: workerEmail }).update({ role: 'WORKER' });
    const admin = await loginUser(testApp, adminEmail, PASSWORD);
    adminToken = admin.accessToken;
    adminId = admin.user.id;
    workerToken = (await loginUser(testApp, workerEmail, PASSWORD)).accessToken;
    const space = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set(as(adminToken))
      .send({ name: 'Props', slug: `props-${stamp}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(201);
    spaceId = (space.body as { id: string }).id;
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('options told apart by id', () => {
    const select = {
      key: 'priority',
      label: 'Priority',
      options: ['low', 'high'],
      required: false,
      type: DatabasePropertyType.SELECT,
    };

    it('gives each option an id the server chose, and keeps it when the option is renamed', async () => {
      const { collection, schema } = await createCollection('Ids', [select]);
      const low = optionOf(schema, 'priority', 'low');
      const row = await createRow('Row', collection.id, { priority: low.id });
      const versionBefore = (await prisma.models.Block.select('version').where({ id: row.id }).first())?.version;

      await request(testApp.getServer())
        .post(`/api/v1/spaces/${spaceId}/pages/${collection.id}/schema/properties/priority/rewrite-option`)
        .set(as(adminToken))
        .send({ optionId: low.id, to: 'minor' })
        .expect(201);

      const renamed = await readSchema(collection.id);
      expect(optionOf(renamed, 'priority', 'minor').id).toBe(low.id);
      expect(await storedValues(row.id)).toEqual({ priority: low.id });
      expect((await prisma.models.Block.select('version').where({ id: row.id }).first())?.version).toBe(versionBefore);
    });

    it('lists the collections of the space and leaves out the pages that are not one', async () => {
      const { collection } = await createCollection('Listed collection', []);
      await createPage('Plain page');

      const response = await request(testApp.getServer())
        .get(`/api/v1/spaces/${spaceId}/collections`)
        .set(as(adminToken))
        .expect(200);

      const listed = response.body as { id: string; title: string }[];
      expect(listed.some((entry) => entry.id === collection.id && entry.title === 'Listed collection')).toBe(true);
      expect(listed.some((entry) => entry.title === 'Plain page')).toBe(false);
    });

    it('clears the rows that held an option when the whole shape is saved without it', async () => {
      const { collection, schema } = await createCollection('Ids dropped', [select]);
      const low = optionOf(schema, 'priority', 'low');
      const high = optionOf(schema, 'priority', 'high');
      const lowRow = await createRow('Low', collection.id, { priority: low.id });
      const highRow = await createRow('High', collection.id, { priority: high.id });

      await define(collection.id, [title, { ...select, options: [high] }]).expect(201);

      expect(await storedValues(lowRow.id)).toEqual({});
      expect(await storedValues(highRow.id)).toEqual({ priority: high.id });
    });

    it('keeps the ids of the options when the whole shape is saved again', async () => {
      const { collection, schema } = await createCollection('Ids kept', [select]);
      const before = optionOf(schema, 'priority', 'high').id;

      await define(collection.id, [title, { ...select, options: schema.properties[1]?.options }]).expect(201);

      expect(optionOf(await readSchema(collection.id), 'priority', 'high').id).toBe(before);
    });
  });

  describe('status', () => {
    const stage = {
      key: 'stage',
      label: 'Stage',
      options: [
        { group: 'TO_DO', value: 'Next' },
        { group: 'TO_DO', value: 'Later' },
        { group: 'IN_PROGRESS', value: 'Doing' },
        { group: 'COMPLETE', value: 'Done' },
      ],
      required: false,
      type: DatabasePropertyType.STATUS,
    };

    it('starts a new status with an option in each group and a new row on the first one that has not begun', async () => {
      const { collection, schema } = await createCollection('Status default', [
        { key: 'stage', label: 'Stage', options: null, required: false, type: DatabasePropertyType.STATUS },
      ]);
      const groups = schema.properties.find((property) => property.key === 'stage')?.options?.map((o) => o.group);
      expect(groups).toEqual(['TO_DO', 'IN_PROGRESS', 'COMPLETE']);

      const row = await createRow('Row', collection.id);

      expect(row.propertyValues).toEqual({ stage: schema.properties[1]?.options?.[0]?.id });
    });

    it('gives the existing rows a status when the property is added later', async () => {
      const { collection } = await createCollection('Status backfill', []);
      const row = await createRow('Old row', collection.id);

      await define(collection.id, [
        title,
        { key: 'stage', label: 'Stage', options: null, required: false, type: DatabasePropertyType.STATUS },
      ]).expect(201);

      const schema = await readSchema(collection.id);
      expect((await storedValues(row.id)).stage).toBe(schema.properties[1]?.options?.[0]?.id);
    });

    it('moves the rows of a removed option to another option of the same group, and keeps a group from emptying', async () => {
      const { collection, schema } = await createCollection('Status removal', [stage]);
      const next = optionOf(schema, 'stage', 'Next');
      const later = optionOf(schema, 'stage', 'Later');
      const doing = optionOf(schema, 'stage', 'Doing');
      const row = await createRow('Row', collection.id, { stage: next.id });
      const removal = (optionId: string) =>
        request(testApp.getServer())
          .post(`/api/v1/spaces/${spaceId}/pages/${collection.id}/schema/properties/stage/rewrite-option`)
          .set(as(adminToken))
          .send({ optionId });

      await removal(next.id).expect(201);
      expect((await storedValues(row.id)).stage).toBe(later.id);
      await removal(doing.id).expect(400);
    });

    it('refuses to empty a status', async () => {
      const { collection } = await createCollection('Status empty', [stage]);
      const row = await createRow('Row', collection.id);

      await patchValues(row.id, { stage: null }).expect(400);
    });
  });

  describe('unique id', () => {
    const code = {
      config: { prefix: 'TSK' },
      key: 'code',
      label: 'Code',
      options: null,
      required: false,
      type: DatabasePropertyType.UNIQUE_ID,
    };

    it('numbers the rows one after the other and never lets the client choose the number', async () => {
      const { collection } = await createCollection('Numbered', [code]);

      const first = await createRow('First', collection.id);
      const second = await createRow('Second', collection.id);
      const refused = await createPage('Greedy', collection.id, { code: 99 });

      expect([first.propertyValues, second.propertyValues]).toEqual([{ code: 1 }, { code: 2 }]);
      expect(refused.status).toBe(400);
      await patchValues(first.id, { code: 50 }).expect(400);
    });

    it('does not hand out a number twice when rows are created at the same time', async () => {
      const { collection } = await createCollection('Numbered at once', [code]);

      const created = await Promise.all(
        Array.from({ length: 5 }, (_unused, index) => createRow(`Row ${String(index)}`, collection.id)),
      );

      const numbers = created.map((row) => row.propertyValues?.code).toSorted();
      expect(numbers).toEqual([1, 2, 3, 4, 5]);
    });

    it('keeps counting when the shape is saved again, and numbers the rows that were there before the property', async () => {
      const { collection } = await createCollection('Numbered later', []);
      const old = await createRow('Old', collection.id);

      await define(collection.id, [title, code]).expect(201);
      expect((await storedValues(old.id)).code).toBe(1);
      const created = await createRow('New', collection.id);
      await define(collection.id, [title, code]).expect(201);
      const last = await createRow('Newest', collection.id);

      expect([created.propertyValues, last.propertyValues]).toEqual([{ code: 2 }, { code: 3 }]);
    });
  });

  describe('creation and edition', () => {
    it('reads them from the block, and refuses a client that tries to write them', async () => {
      const { collection } = await createCollection('Authorship', [
        { key: 'born', label: 'Born', options: null, required: false, type: DatabasePropertyType.CREATED_TIME },
        { key: 'editor', label: 'Editor', options: null, required: false, type: DatabasePropertyType.EDITED_BY },
      ]);
      const row = await createRow('Row', collection.id);

      const { rows } = await listRows(collection.id);

      const values = rows[0]?.propertyValues as { born: { start: string }; editor: string };
      expect(values.editor).toBe(adminId);
      expect(Date.parse(values.born.start)).toBeGreaterThan(0);
      expect(await storedValues(row.id)).toEqual({});
      await patchValues(row.id, { editor: adminId }).expect(400);
    });
  });

  describe('people, dates, numbers and text', () => {
    it('keeps several people only in a person column that allows them', async () => {
      const { collection } = await createCollection('People', [
        { key: 'one', label: 'One', options: null, required: false, type: DatabasePropertyType.PERSON },
        {
          config: { allowsMultiple: true },
          key: 'many',
          label: 'Many',
          options: null,
          required: false,
          type: DatabasePropertyType.PERSON,
        },
      ]);
      const row = await createRow('Row', collection.id);

      await patchValues(row.id, { many: [adminId] }).expect(200);
      await patchValues(row.id, { one: [adminId, adminId] }).expect(400);
      await patchValues(row.id, { one: 'not-a-list' }).expect(400);
    });

    it('stores a range of dates and refuses one that ends before it starts', async () => {
      const { collection } = await createCollection('Dates', [
        { key: 'when', label: 'When', options: null, required: false, type: DatabasePropertyType.DATE },
      ]);
      const row = await createRow('Row', collection.id);

      await patchValues(row.id, { when: { end: '2026-10-25', start: '2026-10-20' } }).expect(200);
      await patchValues(row.id, { when: { end: '2026-10-19', start: '2026-10-20' } }).expect(400);
      await patchValues(row.id, { when: '2026-10-20' }).expect(400);
      expect((await storedValues(row.id)).when).toEqual({ end: '2026-10-25', start: '2026-10-20' });
    });

    it('holds a number to the decimals its column allows', async () => {
      const { collection } = await createCollection('Money', [
        {
          config: { currency: 'CLP', decimals: 0, numberFormat: 'CURRENCY' },
          key: 'budget',
          label: 'Budget',
          options: null,
          required: false,
          type: DatabasePropertyType.NUMBER,
        },
      ]);
      const row = await createRow('Row', collection.id);

      await patchValues(row.id, { budget: 1500 }).expect(200);
      await patchValues(row.id, { budget: 1500.5 }).expect(400);
    });

    it('checks the web address, the email and the phone', async () => {
      const { collection } = await createCollection('Contact', [
        { key: 'site', label: 'Site', options: null, required: false, type: DatabasePropertyType.URL },
        { key: 'mail', label: 'Mail', options: null, required: false, type: DatabasePropertyType.EMAIL },
        { key: 'phone', label: 'Phone', options: null, required: false, type: DatabasePropertyType.PHONE },
      ]);
      const row = await createRow('Row', collection.id);

      await patchValues(row.id, {
        mail: 'ana@neuma.example',
        phone: '+56 9 1234 5678',
        site: 'https://neuma.example',
      }).expect(200);
      await patchValues(row.id, { site: 'javascript:alert(1)' }).expect(400);
      await patchValues(row.id, { mail: 'ana' }).expect(400);
      await patchValues(row.id, { phone: 'call me' }).expect(400);
    });

    it('refuses files that are not the writer’s to attach', async () => {
      const { collection } = await createCollection('Files', [
        { key: 'docs', label: 'Docs', options: null, required: false, type: DatabasePropertyType.FILES },
      ]);
      const row = await createRow('Row', collection.id);

      await patchValues(row.id, { docs: ['a-file-that-does-not-exist'] }).expect(400);
    });
  });

  describe('required', () => {
    const notes = { key: 'notes', label: 'Notes', options: null, required: true, type: DatabasePropertyType.RICH_TEXT };
    const link = { key: 'link', label: 'Link', options: null, required: false, type: DatabasePropertyType.URL };

    it('asks for it when a row is created, and when it is cleared, but not when something else is edited', async () => {
      const { collection } = await createCollection('Required', [link]);
      const old = await createRow('Old row', collection.id);
      await define(collection.id, [title, link, notes]).expect(201);

      const created = await createPage('New row', collection.id, {});
      await patchValues(old.id, { link: 'https://neuma.example' }).expect(200);
      await patchValues(old.id, { notes: 'filled' }).expect(200);
      await patchValues(old.id, { notes: null }).expect(400);

      expect(created.status).toBe(400);
    });
  });

  describe('relations', () => {
    const relationTo = (targetCollectionId: string) => ({
      config: { targetCollectionId },
      key: 'project',
      label: 'Project',
      options: null,
      required: false,
      twoWay: true,
      type: DatabasePropertyType.RELATION,
    });

    const setUp = async (label: string) => {
      const { collection: projects } = await createCollection(`Projects ${label}`, []);
      const { collection: tasks, schema } = await createCollection(`Tasks ${label}`, [relationTo(projects.id)]);
      const mirror = (await readSchema(projects.id)).properties.find((property) => property.type === 'RELATION');
      const task = await createRow('Task', tasks.id);
      const project = await createRow('Project', projects.id);
      return { mirrorKey: mirror?.key ?? '', project, projects, schema, task, tasks };
    };

    it('creates the property on the other collection when the relation goes both ways', async () => {
      const { mirrorKey, projects, schema } = await setUp('mirror');

      const relation = schema.properties.find((property) => property.key === 'project');
      expect(relation?.config).toMatchObject({ mirrorPropertyKey: mirrorKey, targetCollectionId: projects.id });
      expect(mirrorKey).not.toBe('');
    });

    it('adds the row to both sides in one transaction, and takes it out of both', async () => {
      const { mirrorKey, project, task } = await setUp('both');

      const added = await transact(adminToken, [relationOp('addRelation', task.id, 'project', project.id)]);

      expect(added.error).toBeUndefined();
      expect(await storedValues(task.id)).toEqual({ project: [project.id] });
      expect(await storedValues(project.id)).toEqual({ [mirrorKey]: [task.id] });

      await transact(adminToken, [relationOp('removeRelation', task.id, 'project', project.id)]);
      expect(await storedValues(task.id)).toEqual({});
      expect(await storedValues(project.id)).toEqual({});
    });

    it('refuses to write a relation as a plain value', async () => {
      const { project, task } = await setUp('plain');

      await patchValues(task.id, { project: [project.id] }).expect(400);
    });

    it('refuses the whole operation, naming the mirror side, when the writer cannot edit the other row', async () => {
      const { mirrorKey, project, task } = await setUp('forbidden');
      await prisma.models.Block.where({ id: project.id }).update({
        permissions: [{ principal: { kind: 'space' }, role: 'reader' }],
      });

      const refused = await transact(workerToken, [relationOp('addRelation', task.id, 'project', project.id)]);

      expect(refused.error?.code).toBe('RELATION_MIRROR_FORBIDDEN');
      expect(await storedValues(task.id)).toEqual({});
      expect(await storedValues(project.id)).not.toHaveProperty(mirrorKey);
    });

    it('does not show a row the reader cannot see, in the cell or among the related rows', async () => {
      const { project, task, tasks } = await setUp('hidden');
      await transact(adminToken, [relationOp('addRelation', task.id, 'project', project.id)]);
      await prisma.models.Block.where({ id: project.id }).update({
        permissions: [{ principal: { kind: 'user', userId: adminId }, role: 'full' }],
      });

      const asWorker = await listRows(tasks.id, workerToken);
      const asAdmin = await listRows(tasks.id);

      expect(asWorker.rows[0]?.propertyValues).toEqual({ project: [] });
      expect(asWorker.relatedRows).toEqual([]);
      expect(asAdmin.rows[0]?.propertyValues).toEqual({ project: [project.id] });
      expect(asAdmin.relatedRows.map((row) => row.id)).toEqual([project.id]);
    });

    it('refuses a row that does not belong to the collection the relation points to', async () => {
      const { task, tasks } = await setUp('wrong');
      const other = await createRow('Another task', tasks.id);

      const refused = await transact(adminToken, [relationOp('addRelation', task.id, 'project', other.id)]);

      expect(refused.error?.code).toBe('BLOCK_OPERATION_INVALID');
    });

    it('lets the other side go one-way, with its values, when the relation is removed', async () => {
      const { mirrorKey, project, projects, task, tasks } = await setUp('unlink');
      await transact(adminToken, [relationOp('addRelation', task.id, 'project', project.id)]);

      await define(tasks.id, [title]).expect(201);

      const kept = (await readSchema(projects.id)).properties.find((property) => property.key === mirrorKey);
      expect(kept?.config).toMatchObject({ targetCollectionId: tasks.id });
      expect(kept?.config?.mirrorPropertyKey ?? null).toBeNull();
    });
  });

  describe('adding a property to a collection that has rows', () => {
    const code = { config: null, key: 'code', label: 'Code', options: null, required: false, type: 'UNIQUE_ID' };

    it('numbers the existing rows in the same transaction as the schema, or changes nothing at all', async () => {
      const { collection } = await createCollection('Atomic backfill', []);
      const row = await createRow('Row the writer cannot edit', collection.id);
      await prisma.models.Block.where({ id: row.id }).update({
        permissions: [{ principal: { kind: 'space' }, role: 'reader' }],
      });

      const refused = await define(collection.id, [title, code], workerToken);

      expect(refused.status).toBeGreaterThanOrEqual(400);
      expect((await readSchema(collection.id)).properties.map((property) => property.key)).not.toContain('code');
      expect(await storedValues(row.id)).toEqual({});
    });

    it('leaves the counter where it was when the backfill fails', async () => {
      const { collection } = await createCollection('Atomic counter', []);
      const row = await createRow('Locked', collection.id);
      await prisma.models.Block.where({ id: row.id }).update({
        permissions: [{ principal: { kind: 'space' }, role: 'reader' }],
      });
      await define(collection.id, [title, code], workerToken);
      await prisma.models.Block.where({ id: row.id }).update({ permissions: null });

      await define(collection.id, [title, code]).expect(201);

      expect((await storedValues(row.id)).code).toBe(1);
    });
  });

  describe('values the server assigns, through a raw block transaction', () => {
    const managed = [
      { key: 'code', label: 'Code', options: null, required: false, type: DatabasePropertyType.UNIQUE_ID },
      { key: 'born', label: 'Born', options: null, required: false, type: DatabasePropertyType.CREATED_TIME },
      { key: 'author', label: 'Author', options: null, required: false, type: DatabasePropertyType.CREATED_BY },
      { key: 'note', label: 'Note', options: null, required: false, type: DatabasePropertyType.RICH_TEXT },
    ];

    const writeValues = (rowId: string, values: Record<string, unknown>) => ({
      args: { values },
      command: 'update',
      path: ['properties'],
      pointer: { id: rowId, table: 'block' },
    });

    it('refuses to change the unique id or an author field of a row, and leaves the row as it was', async () => {
      const { collection } = await createCollection('Raw managed', managed);
      const row = await createRow('Row', collection.id);
      const before = await storedValues(row.id);

      const number = await transact(adminToken, [writeValues(row.id, { ...before, code: 99 })]);
      const author = await transact(adminToken, [writeValues(row.id, { ...before, author: adminId })]);

      expect(number.error?.code).toBe('BLOCK_PROPERTY_SERVER_ASSIGNED');
      expect(author.error?.code).toBe('BLOCK_PROPERTY_SERVER_ASSIGNED');
      expect(await storedValues(row.id)).toEqual(before);
    });

    it('lets the same transaction change the values a client may write', async () => {
      const { collection } = await createCollection('Raw managed ok', managed);
      const row = await createRow('Row', collection.id);
      const before = await storedValues(row.id);

      const written = await transact(adminToken, [writeValues(row.id, { ...before, note: 'hello' })]);

      expect(written.error).toBeUndefined();
      expect(await storedValues(row.id)).toEqual({ ...before, note: 'hello' });
    });

    it('refuses a row created with an author field, and numbers it when it asks for a number', async () => {
      const { collection } = await createCollection('Raw managed new', managed);
      const rowId = crypto.randomUUID();
      const createOperations = (values: Record<string, unknown>) => [
        {
          args: {
            id: rowId,
            parentId: collection.id,
            properties: { title: [{ insert: 'Raw' }], values },
            type: 'page',
          },
          command: 'set',
          path: [],
          pointer: { id: rowId, table: 'block' },
        },
        {
          args: { id: rowId },
          command: 'listAfter',
          path: ['children'],
          pointer: { id: collection.id, table: 'block' },
        },
      ];

      const refused = await transact(adminToken, createOperations({ author: adminId }));
      const accepted = await transact(adminToken, createOperations({ code: 500 }));

      expect(refused.error?.code).toBe('BLOCK_PROPERTY_SERVER_ASSIGNED');
      expect(accepted.error).toBeUndefined();
      expect((await storedValues(rowId)).code).toBe(1);
    });
  });
});
