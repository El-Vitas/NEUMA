import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { DatabasePropertyType, SpaceVisibility } from '@neuma/db';
import type { PageQueryRequest, PageQueryResponse } from '@neuma/shared';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface SchemaResponse {
  properties: { key: string; options?: { id: string; value: string }[] | null }[];
}

const PASSWORD = 'plainPassword123';

const PROPERTIES = [
  { key: 'title', label: 'Title', options: null, required: true, type: DatabasePropertyType.TITLE },
  { key: 'notes', label: 'Notes', options: null, required: false, type: DatabasePropertyType.RICH_TEXT },
  { key: 'site', label: 'Site', options: null, required: false, type: DatabasePropertyType.URL },
  { key: 'contact', label: 'Contact', options: null, required: false, type: DatabasePropertyType.EMAIL },
  { key: 'kind', label: 'Kind', options: ['quarterly', 'annual'], required: false, type: DatabasePropertyType.SELECT },
  { key: 'points', label: 'Points', options: null, required: false, type: DatabasePropertyType.NUMBER },
];

describe('Searching the rows of a collection (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let token: string;
  let spaceId: string;
  let collectionId: string;
  let ids: Record<string, string>;

  const as = () => ({ Authorization: `Bearer ${token}` });

  const ask = async (body: PageQueryRequest): Promise<PageQueryResponse> =>
    (
      await request(testApp.getServer())
        .post(`/api/v1/spaces/${spaceId}/pages/${collectionId}/query`)
        .set(as())
        .send(body)
        .expect(200)
    ).body as PageQueryResponse;

  const found = async (search: string): Promise<string[]> => {
    const response = await ask({ reducers: [{ id: 'rows', kind: 'results', limit: 100 }], search });
    const outcome = response.reducers.rows;
    if (outcome?.kind !== 'results') throw new Error('not results');
    return outcome.ids.map((id) => response.rows[id]?.title ?? id).sort();
  };

  const counted = async (search: string): Promise<number> => {
    const response = await ask({
      reducers: [
        {
          by: 'NONE',
          id: 'count',
          items: [{ calculation: 'COUNT_ALL', id: 'all', propertyKey: null }],
          kind: 'aggregations',
        },
      ],
      search,
    });
    const outcome = response.reducers.count;
    if (outcome?.kind !== 'aggregations') throw new Error('not aggregations');
    return outcome.distinctRowCount;
  };

  const createRow = async (title: string, values: Record<string, unknown>): Promise<string> => {
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
        propertyValues: values,
        title,
      })
      .expect(201);
    return (response.body as { id: string }).id;
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    const stamp = String(Date.now());
    const email = `search-admin-${stamp}@test.com`;
    await createAccount(testApp, { email, name: 'Search Admin', password: PASSWORD });
    await prisma.models.User.where({ email }).update({ role: 'ADMIN' });
    token = (await loginUser(testApp, email, PASSWORD)).accessToken;
    const space = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set(as())
      .send({ name: 'Search', slug: `search-${stamp}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(201);
    spaceId = (space.body as { id: string }).id;
    const page = await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set(as())
      .send({
        content: {
          content: [{ content: [{ text: 'Search', type: 'text' }], type: 'paragraph' }],
          schemaVersion: 1,
          type: 'doc',
        },
        title: 'Search',
      })
      .expect(201);
    collectionId = (page.body as { id: string }).id;
    const defined = await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages/${collectionId}/schema`)
      .set(as())
      .send({ properties: PROPERTIES, views: [{ configuration: {}, isDefault: true, name: 'Table', type: 'TABLE' }] })
      .expect(201);
    const kind = (defined.body as SchemaResponse).properties.find((property) => property.key === 'kind');
    const quarterly = kind?.options?.find((option) => option.value === 'quarterly')?.id ?? '';
    ids = {
      byEmail: await createRow('Plain two', { contact: 'maria@example.com' }),
      byNotes: await createRow('Plain one', { notes: 'Preparar la Reunión con dirección' }),
      byNumber: await createRow('Plain five', { points: 4242 }),
      bySelect: await createRow('Plain four', { kind: quarterly }),
      bySite: await createRow('Plain three', { site: 'https://docs.example.com/quarterly-plan' }),
      byTitle: await createRow('Informe anual', {}),
    };
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('finds a row by its title, without caring for case or accents', async () => {
    expect(await found('INFORME')).toEqual(['Informe anual']);
    expect(await found('informé')).toEqual(['Informe anual']);
  });

  it('finds a row by what a text answer says, as the screen did when it searched what it had loaded', async () => {
    expect(await found('reunion')).toEqual(['Plain one']);
    expect(await found('DIRECCIÓN')).toEqual(['Plain one']);
  });

  it('finds a row by its link and by its email, which are text too', async () => {
    expect(await found('docs.example')).toEqual(['Plain three']);
    expect(await found('maria@')).toEqual(['Plain two']);
  });

  it('does not search numbers or the names of options, since typing "4" would match half the collection', async () => {
    expect(await found('4242')).toEqual([]);
    expect(await found('quarterly')).toEqual(['Plain three']);
  });

  it('counts the rows the search lets through, the same as the rows themselves', async () => {
    expect(await counted('example')).toBe(2);
    expect(await counted('nothing at all')).toBe(0);
    expect(Object.keys(ids)).toHaveLength(6);
  });

  it('takes the words literally: a percent sign is not a wildcard', async () => {
    expect(await found('%')).toEqual([]);
  });
});
