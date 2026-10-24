import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { DatabasePropertyType, DatabaseViewType, SpaceVisibility } from '@neuma/db';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface SchemaResponse {
  properties: { key: string; options?: { id: string; value: string }[] | null }[];
  views: { id: string; name: string }[];
}

const PASSWORD = 'plainPassword123';

const PROPERTIES = [
  { key: 'title', label: 'Title', options: null, required: true, type: DatabasePropertyType.TITLE },
  {
    key: 'tags',
    label: 'Tags',
    options: ['a', 'b', 'c', 'd'],
    required: false,
    type: DatabasePropertyType.MULTI_SELECT,
  },
];

describe('Moving a card of a list property by what changes (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let token: string;
  let spaceId: string;
  let collectionId: string;
  let boardId: string;
  let tag: Record<string, string>;

  const as = () => ({ Authorization: `Bearer ${token}` });
  const base = (): string => `/api/v1/spaces/${spaceId}/pages/${collectionId}`;

  const move = (rowId: string, body: Record<string, unknown>) =>
    request(testApp.getServer())
      .post(`${base()}/views/${boardId}/move-row`)
      .set(as())
      .send({ rowId, values: {}, ...body });

  const createRow = async (title: string, tags: readonly string[]): Promise<string> => {
    const response = await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set(as())
      .send({
        content: {
          content: [{ content: [{ text: title, type: 'text' }], type: 'paragraph' }],
          schemaVersion: 1,
          type: 'doc',
        },
        parentId: collectionId,
        propertyValues: { tags },
        title,
      })
      .expect(201);
    return (response.body as { id: string }).id;
  };

  const storedTags = async (rowId: string): Promise<readonly string[]> => {
    const stored = await prisma.models.Block.select('properties').where({ id: rowId }).first();
    const values = (stored?.properties as { values?: { tags?: string[] } } | undefined)?.values;
    return values?.tags ?? [];
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    const stamp = String(Date.now());
    const email = `lists-admin-${stamp}@test.com`;
    await createAccount(testApp, { email, name: 'Lists Admin', password: PASSWORD });
    await prisma.models.User.where({ email }).update({ role: 'ADMIN' });
    token = (await loginUser(testApp, email, PASSWORD)).accessToken;
    const space = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set(as())
      .send({ name: 'Lists', slug: `lists-${stamp}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(201);
    spaceId = (space.body as { id: string }).id;
    const page = await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set(as())
      .send({
        content: {
          content: [{ content: [{ text: 'Tags', type: 'text' }], type: 'paragraph' }],
          schemaVersion: 1,
          type: 'doc',
        },
        title: 'Tags',
      })
      .expect(201);
    collectionId = (page.body as { id: string }).id;
    const defined = await request(testApp.getServer())
      .post(`${base()}/schema`)
      .set(as())
      .send({
        properties: PROPERTIES,
        views: [{ configuration: { groupBy: 'tags' }, isDefault: true, name: 'Board', type: DatabaseViewType.BOARD }],
      })
      .expect(201);
    const schema = defined.body as SchemaResponse;
    boardId = schema.views[0]?.id ?? '';
    const options = schema.properties.find((property) => property.key === 'tags')?.options ?? [];
    tag = Object.fromEntries(options.map((option) => [option.value, option.id]));
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('takes the entry of the column it leaves and puts the one of the column it enters, keeping the rest', async () => {
    const row = await createRow('Moves', [tag.a ?? '', tag.c ?? '']);

    await move(row, { listChanges: { tags: { add: [tag.b ?? ''], remove: [tag.a ?? ''] } } }).expect(200);

    expect(await storedTags(row)).toEqual([tag.c ?? '', tag.b ?? '']);
  });

  it('keeps what another person put in the list meanwhile, however the two writes interleave', async () => {
    const row = await createRow('Races', [tag.a ?? '', tag.c ?? '']);

    const outcomes = await Promise.all([
      move(row, { listChanges: { tags: { add: [tag.b ?? ''], remove: [tag.a ?? ''] } } }),
      move(row, { listChanges: { tags: { add: [tag.d ?? ''], remove: [] } } }),
    ]);

    expect(outcomes.map((outcome) => outcome.status)).toEqual([200, 200]);
    expect([...(await storedTags(row))].sort()).toEqual([tag.b ?? '', tag.c ?? '', tag.d ?? ''].sort());
  });

  it('writes nothing when an entry is not an option of the property', async () => {
    const row = await createRow('Refused', [tag.a ?? '']);

    await move(row, { listChanges: { tags: { add: ['not-an-option'], remove: [tag.a ?? ''] } } }).expect(400);

    expect(await storedTags(row)).toEqual([tag.a ?? '']);
  });

  it('leaves no key behind when the list ends up empty', async () => {
    const row = await createRow('Empties', [tag.a ?? '']);

    await move(row, { listChanges: { tags: { add: [], remove: [tag.a ?? ''] } } }).expect(200);

    expect(await storedTags(row)).toEqual([]);
  });
});
