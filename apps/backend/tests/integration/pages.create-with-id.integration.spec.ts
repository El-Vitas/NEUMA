import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { SpaceVisibility } from '@neuma/db';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

const PASSWORD = 'plainPassword123';

const CONTENT = {
  content: [{ content: [{ text: 'Row', type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
};

describe('Creating a page with an id of the caller (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let token: string;
  let spaceId: string;
  let collectionId: string;

  const as = () => ({ Authorization: `Bearer ${token}` });

  const create = (body: Record<string, unknown>) =>
    request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set(as())
      .send({ content: CONTENT, title: 'Row', ...body });

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    const stamp = String(Date.now());
    const email = `create-id-${stamp}@test.com`;
    await createAccount(testApp, { email, name: 'Create Id', password: PASSWORD });
    await prisma.models.User.where({ email }).update({ role: 'ADMIN' });
    token = (await loginUser(testApp, email, PASSWORD)).accessToken;
    const space = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set(as())
      .send({ name: 'Create Id', slug: `create-id-${stamp}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(201);
    spaceId = (space.body as { id: string }).id;
    collectionId = ((await create({ title: 'Collection' }).expect(201)).body as { id: string }).id;
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('creates the page with the id it was given', async () => {
    const id = randomUUID();

    const created = await create({ id, parentId: collectionId }).expect(201);

    expect((created.body as { id: string }).id).toBe(id);
  });

  it('answers a repeated request with the page it already made, and makes no second one', async () => {
    const id = randomUUID();

    await create({ id, parentId: collectionId, title: 'Once' }).expect(201);
    const again = await create({ id, parentId: collectionId, title: 'Once' }).expect(201);

    expect((again.body as { id: string }).id).toBe(id);
    const made = await prisma.models.Block.select('id').where({ id }).all();
    expect(made).toHaveLength(1);
  });

  it('answers two simultaneous requests with the same id with the one page, never an error', async () => {
    const id = randomUUID();

    const responses = await Promise.all([
      create({ id, parentId: collectionId, title: 'Race' }),
      create({ id, parentId: collectionId, title: 'Race' }),
      create({ id, parentId: collectionId, title: 'Race' }),
    ]);

    expect(responses.map((response) => response.status)).toEqual([201, 201, 201]);
    const made = await prisma.models.Block.select('id').where({ id }).all();
    expect(made).toHaveLength(1);
  });

  it('refuses an id that is not a UUID', async () => {
    await create({ id: 'not-a-uuid', parentId: collectionId }).expect(400);
  });
});
