import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import { type PageContent, USER_ROLE } from '@neuma/shared';
import request from 'supertest';
import { PAGE_PURGE_DELAY_DAYS } from '@/modules/pages/constants/pages.constants';
import { PagesService } from '@/modules/pages/pages.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface PageResponse {
  id: string;
  order: number;
}

const PASSWORD = 'plainPassword123';
const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_ACCEPTED_WITHIN_A_SECOND = 3000;
const POLL_INTERVAL_MS = 50;

const documentSaying = (text: string): PageContent => ({
  content: [{ attrs: { id: crypto.randomUUID() }, content: [{ text, type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
});

describe('The top-level pages of a space (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let adminToken: string;
  let spaceId: string;
  let otherSpaceId: string;

  const asAdmin = () => ({ Authorization: `Bearer ${adminToken}`, 'x-mutation-id': crypto.randomUUID() });

  const createSpace = async (name: string): Promise<string> => {
    const response = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set(asAdmin())
      .send({ name, slug: `${name}-${String(Date.now())}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(HTTP_CREATED);
    return (response.body as { id: string }).id;
  };

  const createPage = async (title: string, space = spaceId, parentId?: string): Promise<PageResponse> => {
    const response = await request(testApp.getServer())
      .post(`/api/v1/spaces/${space}/pages`)
      .set(asAdmin())
      .send({ content: documentSaying(title), parentId, title })
      .expect(HTTP_CREATED);
    return response.body as PageResponse;
  };

  const path = (pageId: string, space = spaceId): string => `/api/v1/spaces/${space}/pages/${pageId}`;

  const rootsOf = async (space = spaceId): Promise<string[]> => {
    const stored = await prisma.models.Space.select('rootPageIds').where({ id: space }).first();
    return [...(stored?.rootPageIds ?? [])];
  };

  const post = (url: string, body: object = {}) => request(testApp.getServer()).post(url).set(asAdmin()).send(body);
  const patch = (url: string, body: object) => request(testApp.getServer()).patch(url).set(asAdmin()).send(body);

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    const email = `pages-roots-${String(Date.now())}@test.com`;
    await createAccount(testApp, { email, name: 'Roots Admin', password: PASSWORD });
    await prisma.models.User.where({ email }).update({ role: USER_ROLE.ADMIN });
    adminToken = (await loginUser(testApp, email, PASSWORD)).accessToken;
    spaceId = await createSpace('roots');
    otherSpaceId = await createSpace('roots-other');
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('lists a new top-level page last, and the list endpoint orders them as the space does', async () => {
    const first = await createPage('Uno');
    const second = await createPage('Dos');
    const third = await createPage('Tres');

    expect(await rootsOf()).toEqual([first.id, second.id, third.id]);
    const listing = await request(testApp.getServer()).get(`/api/v1/spaces/${spaceId}/pages`).set(asAdmin());
    const orders = new Map((listing.body as PageResponse[]).map((page) => [page.id, page.order]));
    expect(orders.get(first.id)).toBeLessThan(orders.get(second.id) ?? -1);
    expect(orders.get(second.id)).toBeLessThan(orders.get(third.id) ?? -1);
  });

  it('reorders top-level pages', async () => {
    const space = await createSpace('roots-reorder');
    const first = await createPage('Uno', space);
    const second = await createPage('Dos', space);
    const third = await createPage('Tres', space);

    const response = await patch(`${path(third.id, space)}/order`, { beforePageId: first.id }).expect(HTTP_OK);

    expect(await rootsOf(space)).toEqual([third.id, first.id, second.id]);
    expect((response.body as PageResponse[]).map((page) => page.id)).toEqual([third.id, first.id, second.id]);
    await patch(`${path(third.id, space)}/order`, { beforePageId: null }).expect(HTTP_OK);
    expect(await rootsOf(space)).toEqual([first.id, second.id, third.id]);
  });

  it('puts the copy of a top-level page right after the original', async () => {
    const space = await createSpace('roots-copy');
    const first = await createPage('Uno', space);
    const second = await createPage('Dos', space);

    const copy = await post(`${path(first.id, space)}/duplicate`, { includeChildren: false }).expect(HTTP_CREATED);

    expect(await rootsOf(space)).toEqual([first.id, (copy.body as PageResponse).id, second.id]);
  });

  it('adds a page moved to the top last and removes one moved under another page', async () => {
    const space = await createSpace('roots-move');
    const parent = await createPage('Madre', space);
    const child = await createPage('Hija', space, parent.id);
    const other = await createPage('Otra', space);

    await patch(`${path(child.id, space)}/move`, { parentId: null }).expect(HTTP_OK);
    expect(await rootsOf(space)).toEqual([parent.id, other.id, child.id]);

    await patch(`${path(other.id, space)}/move`, { parentId: parent.id }).expect(HTTP_OK);
    expect(await rootsOf(space)).toEqual([parent.id, child.id]);
  });

  it('keeps a trashed page in the list, and puts a page restored to the top back at the end', async () => {
    const space = await createSpace('roots-trash');
    const first = await createPage('Uno', space);
    const parent = await createPage('Madre', space);
    const child = await createPage('Hija', space, parent.id);

    await post(`${path(first.id, space)}/trash`).expect(HTTP_CREATED);
    expect(await rootsOf(space)).toEqual([first.id, parent.id]);

    await post(`${path(child.id, space)}/trash`).expect(HTTP_CREATED);
    await post(`${path(parent.id, space)}/trash`).expect(HTTP_CREATED);
    await post(`${path(child.id, space)}/restore`, { includeChildren: false }).expect(HTTP_CREATED);
    expect(await rootsOf(space)).toEqual([first.id, parent.id, child.id]);
  });

  it('takes a page out of the list of its space when it is deleted forever', async () => {
    const space = await createSpace('roots-purge');
    const first = await createPage('Uno', space);
    const second = await createPage('Dos', space);
    await post(`${path(first.id, space)}/trash`).expect(HTTP_CREATED);
    await request(testApp.getServer()).delete(path(first.id, space)).set(asAdmin()).expect(HTTP_OK);

    const afterDelay = new Date(Date.now() + (PAGE_PURGE_DELAY_DAYS + 1) * 24 * 60 * 60 * 1000);
    await testApp.get(PagesService).purgeDuePages(afterDelay);

    expect(await rootsOf(space)).toEqual([second.id]);
  });

  describe('moving to another space', () => {
    it('lands under the parent of the other space in one step, and leaves the old list', async () => {
      const page = await createPage('Viaja');
      const destination = await createPage('Destino', otherSpaceId);

      await patch(`${path(page.id)}/move`, { parentId: destination.id, targetSpaceId: otherSpaceId }).expect(HTTP_OK);

      expect(await rootsOf()).not.toContain(page.id);
      const stored = await prisma.models.Block.select('parentId', 'spaceId').where({ id: page.id }).first();
      expect(stored).toEqual({ parentId: destination.id, spaceId: otherSpaceId });
    });

    it('lands at the top of the other space when no parent is named', async () => {
      const page = await createPage('Viaja a la raíz');

      await patch(`${path(page.id)}/move`, { parentId: null, targetSpaceId: otherSpaceId }).expect(HTTP_OK);

      expect(await rootsOf()).not.toContain(page.id);
      expect((await rootsOf(otherSpaceId)).at(-1)).toBe(page.id);
    });

    it('changes nothing when the parent of the other space refuses it', async () => {
      const page = await createPage('No viaja');
      const destination = await createPage('Bloqueado', otherSpaceId);
      await patch(`${path(destination.id, otherSpaceId)}/lock`, { locked: true }).expect(HTTP_OK);

      const response = await patch(`${path(page.id)}/move`, { parentId: destination.id, targetSpaceId: otherSpaceId });

      expect(response.status).toBeGreaterThanOrEqual(400);
      const stored = await prisma.models.Block.select('parentId', 'spaceId').where({ id: page.id }).first();
      expect(stored).toEqual({ parentId: null, spaceId });
      expect(await rootsOf()).toContain(page.id);
      expect(await rootsOf(otherSpaceId)).not.toContain(page.id);
    });
  });

  describe('the history of a page written by the editor', () => {
    it('cuts a version a moment after the last transaction of the editor', async () => {
      const page = await createPage('Editada');
      const paragraphId = crypto.randomUUID();
      const before = await prisma.models.PageVersion.where({ pageId: page.id }).all();
      await prisma.models.PageVersion.where({ pageId: page.id }).updateAndCount({
        createdAt: new Date(Date.now() - 60 * 60 * 1000),
      });

      await request(testApp.getServer())
        .post('/api/v1/transactions')
        .set(asAdmin())
        .send({
          transactions: [
            {
              id: crypto.randomUUID(),
              operations: [
                {
                  args: {
                    id: paragraphId,
                    parentId: page.id,
                    properties: { title: [{ insert: 'Nuevo' }] },
                    type: 'paragraph',
                  },
                  command: 'set',
                  path: [],
                  pointer: { id: paragraphId, table: 'block' },
                },
                {
                  args: { id: paragraphId },
                  command: 'listAfter',
                  path: ['children'],
                  pointer: { id: page.id, table: 'block' },
                },
              ],
              spaceId,
            },
          ],
        })
        .expect(HTTP_OK);

      const deadline = Date.now() + HTTP_ACCEPTED_WITHIN_A_SECOND;
      let versions = before.length;
      while (versions <= before.length && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        versions = (await prisma.models.PageVersion.where({ pageId: page.id }).all()).length;
      }
      expect(versions).toBe(before.length + 1);
    });
  });
});
