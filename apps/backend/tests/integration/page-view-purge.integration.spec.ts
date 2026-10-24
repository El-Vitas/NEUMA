import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { DatabasePropertyType, DatabaseViewType, SpaceVisibility } from '@neuma/db';
import request from 'supertest';
import { PAGE_PURGE_DELAY_DAYS } from '@/modules/pages/constants/pages.constants';
import { PagesService } from '@/modules/pages/pages.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

const PASSWORD = 'plainPassword123';

const afterThePurgeDelay = (): Date => new Date(Date.now() + (PAGE_PURGE_DELAY_DAYS + 1) * 24 * 60 * 60 * 1000);

const TITLE = { key: 'title', label: 'Title', options: null, required: true, type: DatabasePropertyType.TITLE };

interface SchemaResponse {
  views: { id: string; name: string }[];
}

describe('Deleting a row for good cleans what pointed at it (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let token: string;
  let spaceId: string;

  const as = () => ({ Authorization: `Bearer ${token}` });

  const createPage = async (title: string, parentId?: string): Promise<string> => {
    const response = await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set(as())
      .send({
        content: {
          content: [{ content: [{ text: title, type: 'text' }], type: 'paragraph' }],
          schemaVersion: 1,
          type: 'doc',
        },
        parentId,
        title,
      })
      .expect(201);
    return (response.body as { id: string }).id;
  };

  const define = async (pageId: string, properties: unknown[]): Promise<SchemaResponse> =>
    (
      await request(testApp.getServer())
        .post(`/api/v1/spaces/${spaceId}/pages/${pageId}/schema`)
        .set(as())
        .send({
          properties: [TITLE, ...properties],
          views: [{ configuration: {}, isDefault: true, name: 'Table', type: DatabaseViewType.TABLE }],
        })
        .expect(201)
    ).body as SchemaResponse;

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    const email = `purge-admin-${String(Date.now())}@test.com`;
    await createAccount(testApp, { email, name: 'Purge Admin', password: PASSWORD });
    await prisma.models.User.where({ email }).update({ role: 'ADMIN' });
    token = (await loginUser(testApp, email, PASSWORD)).accessToken;
    const space = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set(as())
      .send({ name: 'Purge', slug: `purge-${String(Date.now())}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(201);
    spaceId = (space.body as { id: string }).id;
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('removes the id from the relation cells that held it, so no count includes a row that is gone', async () => {
    const targets = await createPage('Targets');
    const tasks = await createPage('Tasks');
    const targetSchema = await define(targets, []);
    await define(tasks, [
      {
        config: { targetCollectionId: targets },
        key: 'links',
        label: 'Links',
        options: null,
        required: false,
        type: DatabasePropertyType.RELATION,
      },
    ]);
    const kept = await createPage('Kept', targets);
    const gone = await createPage('Gone', targets);
    const task = await createPage('Task', tasks);
    for (const targetId of [kept, gone]) {
      await request(testApp.getServer())
        .post('/api/v1/transactions')
        .set(as())
        .send({
          transactions: [
            {
              id: crypto.randomUUID(),
              operations: [
                {
                  args: { property: 'links', targetId },
                  command: 'addRelation',
                  path: [],
                  pointer: { id: task, table: 'block' },
                },
              ],
              spaceId,
            },
          ],
        })
        .expect(200);
    }
    const viewId = targetSchema.views[0]?.id ?? '';
    await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages/${targets}/views/${viewId}/operations`)
      .set(as())
      .send({ operations: [{ args: { after: kept, id: gone }, command: 'listAfter', path: ['manualOrder'] }] })
      .expect(200);
    expect(await readLinks(task)).toEqual([kept, gone]);
    expect(await readOrder(viewId)).toContain(gone);

    await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages/${gone}/trash`)
      .set(as())
      .set('x-mutation-id', crypto.randomUUID())
      .expect(201);
    await request(testApp.getServer())
      .delete(`/api/v1/spaces/${spaceId}/pages/${gone}`)
      .set(as())
      .set('x-mutation-id', crypto.randomUUID());
    await testApp.get(PagesService).purgeDuePages(afterThePurgeDelay());

    expect(await prisma.models.Block.first({ id: gone })).toBeNull();
    expect(await readLinks(task)).toEqual([kept]);
    expect(await readOrder(viewId)).not.toContain(gone);
  });

  const readLinks = async (rowId: string): Promise<readonly string[]> => {
    const block = await prisma.models.Block.select('properties').where({ id: rowId }).first();
    const values = (block?.properties as { values?: { links?: string[] } } | undefined)?.values;
    return values?.links ?? [];
  };

  const readOrder = async (viewId: string): Promise<readonly string[]> =>
    (await prisma.models.PageSchemaView.select('manualOrder').where({ id: viewId }).first())?.manualOrder ?? [];
});
