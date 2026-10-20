import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { DatabasePropertyType, DatabaseViewType, SpaceVisibility } from '@neuma/db';
import { BLOCK_ROLE, type PageContent, USER_ROLE } from '@neuma/shared';
import request from 'supertest';
import { PAGE_PURGE_DELAY_DAYS } from '@/modules/pages/constants/pages.constants';
import { PageSchemaService } from '@/modules/pages/page-schema.service';
import { PagesService } from '@/modules/pages/pages.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface IdResponse {
  id: string;
}

interface PageResponse {
  content: PageContent;
  id: string;
  lifecycle: string;
  lockedAt: null | string;
  order: number;
  parentId: null | string;
  propertyValues: Record<string, unknown> | null;
  spaceId: string;
  title: string;
  version: number;
}

interface SyncedBlockResponse {
  children: string[];
  id: string;
  properties: Record<string, unknown>;
  textState: null | string;
  version: number;
}

interface ErrorResponse {
  code?: string;
  error?: { code: string };
}

const PASSWORD = 'plainPassword123';
const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_FORBIDDEN = 403;
const HTTP_CONFLICT = 409;

const ONE_HOUR_IN_MILLISECONDS = 60 * 60 * 1000;
const MILLISECONDS_PER_DAY = 24 * ONE_HOUR_IN_MILLISECONDS;
const afterThePurgeDelay = (): Date => new Date(Date.now() + (PAGE_PURGE_DELAY_DAYS + 1) * MILLISECONDS_PER_DAY);

const paragraph = (id: string, text: string) => ({
  attrs: { id },
  content: [{ text, type: 'text' as const }],
  type: 'paragraph' as const,
});

const documentSaying = (...paragraphs: readonly (readonly [string, string])[]): PageContent => ({
  content: paragraphs.map(([id, text]) => paragraph(id, text)),
  schemaVersion: 1,
  type: 'doc',
});

const required = <Row>(row: Row | null | undefined, description: string): Row => {
  if (row === null || row === undefined) throw new Error(`Expected ${description} to exist`);
  return row;
};

const codeOf = (body: unknown): string | undefined => {
  const response = body as ErrorResponse;
  return response.error?.code ?? response.code;
};

describe('Pages stored as blocks (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let adminToken: string;
  let workerToken: string;
  let adminId: string;
  let workerId: string;
  let workspaceId: string;
  let spaceId: string;
  let otherSpaceId: string;

  const asAdmin = () => ({ Authorization: `Bearer ${adminToken}`, 'x-mutation-id': crypto.randomUUID() });

  const createSpace = async (name: string): Promise<string> => {
    const response = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name, slug: `${name}-${String(Date.now())}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(HTTP_CREATED);
    return (response.body as IdResponse).id;
  };

  const createPage = async (
    title: string,
    options: {
      content?: PageContent;
      parentId?: string;
      propertyValues?: Record<string, unknown>;
      space?: string;
    } = {},
  ): Promise<PageResponse> => {
    const response = await request(testApp.getServer())
      .post(`/api/v1/spaces/${options.space ?? spaceId}/pages`)
      .set(asAdmin())
      .send({
        content: options.content ?? documentSaying([crypto.randomUUID(), title]),
        parentId: options.parentId,
        propertyValues: options.propertyValues,
        title,
      })
      .expect(HTTP_CREATED);
    return response.body as PageResponse;
  };

  const pagePath = (pageId: string, space = spaceId): string => `/api/v1/spaces/${space}/pages/${pageId}`;

  const getPage = async (pageId: string, space = spaceId): Promise<PageResponse> => {
    const response = await request(testApp.getServer()).get(pagePath(pageId, space)).set(asAdmin()).expect(HTTP_OK);
    return response.body as PageResponse;
  };

  const readBlock = async (blockId: string) =>
    required(
      await prisma.models.Block.select(
        'alive',
        'children',
        'format',
        'lifecycle',
        'lockedAt',
        'lockedById',
        'ownerId',
        'parentId',
        'properties',
        'purgeAfter',
        'spaceId',
        'trashedAt',
        'verifiedAt',
        'version',
      )
        .where({ id: blockId })
        .first(),
      `block ${blockId}`,
    );

  /** The pages a page lists, in order, without the content blocks that come first. */
  const listChildPageIds = async (pageId: string): Promise<string[]> => {
    const { children } = await readBlock(pageId);
    const pages = await prisma.models.Block.select('id')
      .where({ type: 'page' })
      .where((block) => block.id.in(children))
      .all();
    const pageIds = new Set(pages.map((page) => page.id));
    return children.filter((id) => pageIds.has(id));
  };

  const sync = async (pageId: string): Promise<SyncedBlockResponse[]> => {
    const response = await request(testApp.getServer())
      .post('/api/v1/sync')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pageId })
      .expect(HTTP_OK);
    return (response.body as { blocks: SyncedBlockResponse[] }).blocks;
  };

  const move = (pageId: string, body: object) =>
    request(testApp.getServer())
      .patch(`${pagePath(pageId)}/move`)
      .set(asAdmin())
      .send(body);

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    const timestamp = String(Date.now());
    const adminEmail = `pages-blocks-admin-${timestamp}@test.com`;
    const workerEmail = `pages-blocks-worker-${timestamp}@test.com`;
    await createAccount(testApp, { email: adminEmail, name: 'Pages Admin', password: PASSWORD });
    await createAccount(testApp, { email: workerEmail, name: 'Pages Worker', password: PASSWORD });
    await prisma.models.User.where({ email: adminEmail }).update({ role: USER_ROLE.ADMIN });
    await prisma.models.User.where({ email: workerEmail }).update({ role: USER_ROLE.WORKER });
    adminToken = (await loginUser(testApp, adminEmail, PASSWORD)).accessToken;
    workerToken = (await loginUser(testApp, workerEmail, PASSWORD)).accessToken;
    workerId = required(await prisma.models.User.where({ email: workerEmail }).first(), 'the worker').id;
    adminId = required(await prisma.models.User.where({ email: adminEmail }).first(), 'the admin').id;
    spaceId = await createSpace('pages-blocks');
    otherSpaceId = await createSpace('pages-blocks-other');
    workspaceId = required(await prisma.models.Space.where({ id: spaceId }).first(), 'the space').workspaceId;
    await prisma.models.WorkspaceMember.createAndCount([{ role: USER_ROLE.WORKER, userId: workerId, workspaceId }], {
      onConflict: 'skip',
    });
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('creating', () => {
    it('stores the page as a page block whose children are the blocks of the template, in order', async () => {
      const blockA = crypto.randomUUID();
      const blockB = crypto.randomUUID();

      const page = await createPage('Plan', {
        content: documentSaying([blockA, 'Uno'], [blockB, 'Dos']),
      });

      const stored = await readBlock(page.id);
      expect(stored.parentId).toBeNull();
      expect(stored.children).toEqual([blockA, blockB]);
      expect(stored.properties).toEqual({ title: [{ insert: 'Plan' }] });
      const second = await readBlock(blockB);
      expect(second.parentId).toBe(page.id);
      expect(page.content).toEqual(documentSaying([blockA, 'Uno'], [blockB, 'Dos']));
      expect(page.title).toBe('Plan');
      expect(page.version).toBe(1);
    });

    it('lists a child page after the content blocks of its parent and at the end of the other pages', async () => {
      const blockA = crypto.randomUUID();
      const parent = await createPage('Madre', { content: documentSaying([blockA, 'Texto']) });

      const first = await createPage('Primera', { parentId: parent.id });
      const second = await createPage('Segunda', { parentId: parent.id });

      expect((await readBlock(parent.id)).children).toEqual([blockA, first.id, second.id]);
      expect((await getPage(second.id)).order).toBeGreaterThan((await getPage(first.id)).order);
      expect((await getPage(parent.id)).content).toEqual(documentSaying([blockA, 'Texto']));
    });

    it('cuts the first version of the page as a snapshot of its blocks', async () => {
      const blockA = crypto.randomUUID();

      const page = await createPage('Con historia', { content: documentSaying([blockA, 'Primera']) });

      const versions = await prisma.models.PageVersion.where({ pageId: page.id }).all();
      expect(versions).toHaveLength(1);
      expect(versions[0]).toMatchObject({
        content: documentSaying([blockA, 'Primera']),
        title: 'Con historia',
        version: 1,
      });
    });

    it('gives a new id to a block of the template that another page already owns', async () => {
      const shared = crypto.randomUUID();
      const original = await createPage('Dueña', { content: documentSaying([shared, 'Mío']) });

      const copy = await createPage('Usa el mismo id', { content: documentSaying([shared, 'Otra vez']) });

      expect((await readBlock(shared)).parentId).toBe(original.id);
      const [block] = (await getPage(copy.id)).content.content;
      expect(block).toBeDefined();
      expect(JSON.stringify(block)).not.toContain(shared);
    });

    it('refuses to create a page under one in the trash', async () => {
      const parent = await createPage('Madre en la papelera');
      await request(testApp.getServer())
        .post(`${pagePath(parent.id)}/trash`)
        .set(asAdmin())
        .expect(HTTP_CREATED);

      const response = await request(testApp.getServer())
        .post(`/api/v1/spaces/${spaceId}/pages`)
        .set(asAdmin())
        .send({ content: documentSaying(['x', 'Hija']), parentId: parent.id, title: 'Hija' });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('renaming and decorating', () => {
    it('shows the new title through the sync of the page and moves the version of the page block', async () => {
      const page = await createPage('Antes');
      const before = (await sync(page.id)).find((block) => block.id === page.id);

      await request(testApp.getServer())
        .patch(`${pagePath(page.id)}/title`)
        .set(asAdmin())
        .send({ title: 'Después' })
        .expect(HTTP_OK);

      const synced = required(
        (await sync(page.id)).find((block) => block.id === page.id),
        'the page block',
      );
      expect(synced.properties.title).toEqual([{ insert: 'Después' }]);
      expect(synced.textState).not.toBeNull();
      expect(synced.version).toBeGreaterThan(before?.version ?? 0);
      expect((await getPage(page.id)).title).toBe('Después');
    });

    it('keeps the icon and the cover in the format of the block', async () => {
      const page = await createPage('Con adorno');
      const assetId = crypto.randomUUID();

      await request(testApp.getServer())
        .patch(`${pagePath(page.id)}/icon`)
        .set(asAdmin())
        .send({ icon: { kind: 'emoji', value: '🚀' } })
        .expect(HTTP_OK);
      await request(testApp.getServer())
        .patch(`${pagePath(page.id)}/cover`)
        .set(asAdmin())
        .send({ cover: { assetId, position: 30 } })
        .expect(HTTP_OK);

      expect((await readBlock(page.id)).format).toEqual({
        cover: { assetId, position: 30 },
        icon: { kind: 'emoji', value: '🚀' },
      });

      await request(testApp.getServer())
        .patch(`${pagePath(page.id)}/icon`)
        .set(asAdmin())
        .send({ icon: null })
        .expect(HTTP_OK);

      expect((await readBlock(page.id)).format).toEqual({ cover: { assetId, position: 30 } });
    });

    it('records an owner and a verification as columns of the block, and clears them again', async () => {
      const page = await createPage('Con dueño');

      await request(testApp.getServer())
        .patch(`${pagePath(page.id)}/owner`)
        .set(asAdmin())
        .send({ ownerId: workerId })
        .expect(HTTP_OK);
      await request(testApp.getServer())
        .patch(`${pagePath(page.id)}/verification`)
        .set(asAdmin())
        .send({ verified: true })
        .expect(HTTP_OK);

      const verified = await readBlock(page.id);
      expect(verified.ownerId).toBe(workerId);
      expect(verified.verifiedAt).toBeInstanceOf(Date);

      await request(testApp.getServer())
        .patch(`${pagePath(page.id)}/verification`)
        .set(asAdmin())
        .send({ verified: false })
        .expect(HTTP_OK);

      expect((await readBlock(page.id)).verifiedAt).toBeNull();
    });
  });

  describe('moving and ordering', () => {
    it('keeps the lists of both parents right when a page changes parent', async () => {
      const from = await createPage('Origen');
      const to = await createPage('Destino');
      const stays = await createPage('Se queda', { parentId: from.id });
      const goes = await createPage('Se va', { parentId: from.id });

      await move(goes.id, { parentId: to.id }).expect(HTTP_OK);

      expect((await readBlock(from.id)).children.filter((id) => id === goes.id)).toEqual([]);
      expect((await readBlock(from.id)).children).toContain(stays.id);
      expect((await readBlock(to.id)).children.at(-1)).toBe(goes.id);
      expect((await readBlock(goes.id)).parentId).toBe(to.id);
      expect((await getPage(goes.id)).parentId).toBe(to.id);
    });

    it('takes a page to the top of its space and out of the list of its parent', async () => {
      const parent = await createPage('Madre');
      const child = await createPage('Hija', { parentId: parent.id });

      await move(child.id, { parentId: null }).expect(HTTP_OK);

      expect((await readBlock(parent.id)).children).not.toContain(child.id);
      expect((await readBlock(child.id)).parentId).toBeNull();
    });

    it('refuses to hang a page under its own descendant and changes nothing', async () => {
      const parent = await createPage('Abuela');
      const child = await createPage('Nieta', { parentId: parent.id });

      const response = await move(parent.id, { parentId: child.id });

      expect(response.status).toBe(HTTP_CONFLICT);
      expect((await readBlock(parent.id)).parentId).toBeNull();
      expect((await readBlock(parent.id)).children).toContain(child.id);
    });

    it('moves a page to another space with everything below it, and lists it in its new parent', async () => {
      const parent = await createPage('Viaja');
      const blockId = crypto.randomUUID();
      const child = await createPage('Viaja también', {
        content: documentSaying([blockId, 'Texto']),
        parentId: parent.id,
      });
      const destination = await createPage('Destino', { space: otherSpaceId });

      await move(parent.id, { parentId: destination.id, targetSpaceId: otherSpaceId }).expect(HTTP_OK);

      for (const id of [parent.id, child.id, blockId]) expect((await readBlock(id)).spaceId).toBe(otherSpaceId);
      expect((await readBlock(parent.id)).parentId).toBe(destination.id);
      expect((await readBlock(destination.id)).children).toContain(parent.id);
      expect((await getPage(child.id, otherSpaceId)).spaceId).toBe(otherSpaceId);
    });

    it('places a page before one of its siblings in the list of the page that holds them', async () => {
      const parent = await createPage('Lista', { content: documentSaying([crypto.randomUUID(), 'Texto']) });
      const first = await createPage('Uno', { parentId: parent.id });
      const second = await createPage('Dos', { parentId: parent.id });
      const third = await createPage('Tres', { parentId: parent.id });

      const response = await request(testApp.getServer())
        .patch(`${pagePath(third.id)}/order`)
        .set(asAdmin())
        .send({ beforePageId: first.id })
        .expect(HTTP_OK);

      const siblings = response.body as PageResponse[];
      expect(siblings.map((page) => page.id)).toEqual([third.id, first.id, second.id]);
      const listed = (await readBlock(parent.id)).children.filter((id) => [first.id, second.id, third.id].includes(id));
      expect(listed).toEqual([third.id, first.id, second.id]);
    });
  });

  describe('duplicating', () => {
    it('copies the page right after the original with new ids, and renames only the copy', async () => {
      const parent = await createPage('Carpeta');
      const blockA = crypto.randomUUID();
      const original = await createPage('Original', {
        content: documentSaying([blockA, 'Texto']),
        parentId: parent.id,
      });
      const after = await createPage('Después', { parentId: parent.id });

      const response = await request(testApp.getServer())
        .post(`${pagePath(original.id)}/duplicate`)
        .set(asAdmin())
        .send({ includeChildren: false, title: 'Original (copia)' })
        .expect(HTTP_CREATED);

      const copy = response.body as PageResponse;
      const children = (await readBlock(parent.id)).children;
      expect(children.indexOf(copy.id)).toBe(children.indexOf(original.id) + 1);
      expect(children.indexOf(after.id)).toBe(children.indexOf(copy.id) + 1);
      expect(copy.title).toBe('Original (copia)');
      expect(JSON.stringify(copy.content)).not.toContain(blockA);
      expect(copy.content.content).toHaveLength(1);
      expect((await getPage(original.id)).content).toEqual(documentSaying([blockA, 'Texto']));
    });

    it('copies the pages below it too, under the copy and in the same order, pointing at each other', async () => {
      const root = await createPage('Raíz');
      const first = await createPage('Primera hija', { parentId: root.id });
      const second = await createPage('Segunda hija', { parentId: root.id });
      const grandchild = await createPage('Nieta', { parentId: first.id });

      const response = await request(testApp.getServer())
        .post(`${pagePath(root.id)}/duplicate`)
        .set(asAdmin())
        .send({ includeChildren: true })
        .expect(HTTP_CREATED);

      const copy = response.body as PageResponse;
      const copied = await listChildPageIds(copy.id);
      expect(copied).toHaveLength(2);
      const titles = await Promise.all(copied.map(async (id) => (await getPage(id)).title));
      expect(titles).toEqual(['Primera hija', 'Segunda hija']);
      const [copiedFirst] = copied;
      const copiedGrandchildren = await listChildPageIds(required(copiedFirst, 'the first copied child'));
      expect(copiedGrandchildren).toHaveLength(1);
      const originalIds = [root.id, first.id, second.id, grandchild.id];
      for (const id of [copy.id, ...copied, ...copiedGrandchildren]) expect(originalIds).not.toContain(id);
    });
  });

  describe('the trash', () => {
    it('hides a page and its pages, and brings it back to the place it kept in its parent', async () => {
      const parent = await createPage('Lista');
      const first = await createPage('Uno', { parentId: parent.id });
      const second = await createPage('Dos', { parentId: parent.id });
      const third = await createPage('Tres', { parentId: parent.id });
      const nested = await createPage('Dentro de dos', { parentId: second.id });

      await request(testApp.getServer())
        .post(`${pagePath(second.id)}/trash`)
        .set(asAdmin())
        .expect(HTTP_CREATED);

      const trashed = await readBlock(second.id);
      expect(trashed.lifecycle).toBe('TRASHED');
      expect(trashed.trashedAt).toBeInstanceOf(Date);
      const keptChildren = (await readBlock(parent.id)).children;
      for (const id of [first.id, second.id, third.id]) expect(keptChildren).toContain(id);
      const listing = await request(testApp.getServer())
        .get(`/api/v1/spaces/${spaceId}/pages`)
        .set(asAdmin())
        .expect(HTTP_OK);
      const listedIds = (listing.body as PageResponse[]).map((page) => page.id);
      expect(listedIds).toContain(first.id);
      expect(listedIds).not.toContain(second.id);
      expect(listedIds).not.toContain(nested.id);
      expect((await getPage(nested.id)).lifecycle).toBe('TRASHED');

      const restored = await request(testApp.getServer())
        .post(`${pagePath(second.id)}/restore`)
        .set(asAdmin())
        .send({ includeChildren: false })
        .expect(HTTP_CREATED);

      expect(restored.body).toMatchObject({ parentTitle: 'Lista', restoredToRoot: false });
      expect((await readBlock(second.id)).lifecycle).toBe('ACTIVE');
      const siblings = (await readBlock(parent.id)).children.filter((id) =>
        [first.id, second.id, third.id].includes(id),
      );
      expect(siblings).toEqual([first.id, second.id, third.id]);
      expect((await getPage(nested.id)).lifecycle).toBe('ACTIVE');
    });

    it('takes a restored page out of its parent and to the root when the parent is in the trash', async () => {
      const parent = await createPage('Padre que sigue fuera');
      const child = await createPage('Hija', { parentId: parent.id });
      await request(testApp.getServer())
        .post(`${pagePath(child.id)}/trash`)
        .set(asAdmin())
        .expect(HTTP_CREATED);
      await request(testApp.getServer())
        .post(`${pagePath(parent.id)}/trash`)
        .set(asAdmin())
        .expect(HTTP_CREATED);

      const restored = await request(testApp.getServer())
        .post(`${pagePath(child.id)}/restore`)
        .set(asAdmin())
        .send({ includeChildren: false })
        .expect(HTTP_CREATED);

      expect(restored.body).toMatchObject({ parentTitle: null, restoredToRoot: true });
      expect((await readBlock(child.id)).parentId).toBeNull();
      expect((await readBlock(parent.id)).children).not.toContain(child.id);
      expect((await getPage(child.id)).lifecycle).toBe('ACTIVE');
    });

    it('restores the pages trashed by themselves below a page when asked to', async () => {
      const parent = await createPage('Con hijas');
      const child = await createPage('Hija borrada antes', { parentId: parent.id });
      await request(testApp.getServer())
        .post(`${pagePath(child.id)}/trash`)
        .set(asAdmin())
        .expect(HTTP_CREATED);
      await request(testApp.getServer())
        .post(`${pagePath(parent.id)}/trash`)
        .set(asAdmin())
        .expect(HTTP_CREATED);

      const restored = await request(testApp.getServer())
        .post(`${pagePath(parent.id)}/restore`)
        .set(asAdmin())
        .send({ includeChildren: true })
        .expect(HTTP_CREATED);

      expect((restored.body as { restoredChildCount: number }).restoredChildCount).toBe(1);
      expect((await readBlock(child.id)).lifecycle).toBe('ACTIVE');
      expect((await readBlock(child.id)).parentId).toBe(parent.id);
    });

    it('refuses every write to a page in the trash and writes nothing', async () => {
      const blockA = crypto.randomUUID();
      const page = await createPage('Fuera', { content: documentSaying([blockA, 'Intacto']) });
      await request(testApp.getServer())
        .post(`${pagePath(page.id)}/trash`)
        .set(asAdmin())
        .expect(HTTP_CREATED);

      const renamed = await request(testApp.getServer())
        .patch(`${pagePath(page.id)}/title`)
        .set(asAdmin())
        .send({ title: 'Nuevo' });
      const replaced = await request(testApp.getServer())
        .put(`${pagePath(page.id)}/content`)
        .set(asAdmin())
        .send({ content: documentSaying([blockA, 'Cambiado']) });

      expect(renamed.status).toBe(HTTP_CONFLICT);
      expect(replaced.status).toBe(HTTP_CONFLICT);
      expect((await readBlock(page.id)).properties).toEqual({ title: [{ insert: 'Fuera' }] });
      expect((await readBlock(blockA)).properties).toEqual({ title: [{ insert: 'Intacto' }] });
    });
  });

  describe('locking', () => {
    it('refuses a rename, a content change and a block transaction in a locked page, and allows them once unlocked', async () => {
      const blockA = crypto.randomUUID();
      const page = await createPage('Candado', { content: documentSaying([blockA, 'Firme']) });
      await request(testApp.getServer())
        .patch(`${pagePath(page.id)}/lock`)
        .set(asAdmin())
        .send({ locked: true })
        .expect(HTTP_OK);
      const lockedBlock = await readBlock(page.id);
      expect(lockedBlock.lockedAt).toBeInstanceOf(Date);
      expect(lockedBlock.lockedById).not.toBeNull();

      const renamed = await request(testApp.getServer())
        .patch(`${pagePath(page.id)}/title`)
        .set(asAdmin())
        .send({ title: 'Otro' });
      const replaced = await request(testApp.getServer())
        .put(`${pagePath(page.id)}/content`)
        .set(asAdmin())
        .send({ content: documentSaying([blockA, 'Roto']) });
      const transaction = await request(testApp.getServer())
        .post('/api/v1/transactions')
        .set(asAdmin())
        .send({
          transactions: [
            {
              id: crypto.randomUUID(),
              operations: [
                {
                  args: [{ insert: 'Roto' }],
                  command: 'set',
                  path: ['properties', 'title'],
                  pointer: { id: blockA, table: 'block' },
                },
              ],
              spaceId,
            },
          ],
        });

      expect(renamed.status).toBe(HTTP_CONFLICT);
      expect(codeOf(renamed.body)).toBe('PAGE_LOCKED');
      expect(replaced.status).toBe(HTTP_CONFLICT);
      expect(JSON.stringify(transaction.body)).toContain('PAGE_LOCKED');
      expect((await readBlock(blockA)).properties).toEqual({ title: [{ insert: 'Firme' }] });

      await request(testApp.getServer())
        .patch(`${pagePath(page.id)}/lock`)
        .set(asAdmin())
        .send({ locked: false })
        .expect(HTTP_OK);
      await request(testApp.getServer())
        .patch(`${pagePath(page.id)}/title`)
        .set(asAdmin())
        .send({ title: 'Otro' })
        .expect(HTTP_OK);

      expect((await readBlock(page.id)).lockedAt).toBeNull();
    });
  });

  describe('the content and its history', () => {
    it('writes a replaced document as operations by id: a block that stays keeps its row', async () => {
      const blockA = crypto.randomUUID();
      const blockB = crypto.randomUUID();
      const blockC = crypto.randomUUID();
      const page = await createPage('Edición', { content: documentSaying([blockA, 'Uno'], [blockB, 'Dos']) });
      const versionBefore = (await readBlock(blockA)).version;

      await request(testApp.getServer())
        .put(`${pagePath(page.id)}/content`)
        .set(asAdmin())
        .send({ content: documentSaying([blockA, 'Uno'], [blockC, 'Tres']) })
        .expect(HTTP_OK);

      expect((await readBlock(blockA)).version).toBe(versionBefore);
      expect((await readBlock(blockB)).alive).toBe(false);
      expect((await readBlock(blockC)).parentId).toBe(page.id);
      expect((await readBlock(page.id)).children).toEqual([blockA, blockC]);
      expect((await getPage(page.id)).content).toEqual(documentSaying([blockA, 'Uno'], [blockC, 'Tres']));
    });

    it('appends blocks after the last one and keeps both of two appends made at the same time', async () => {
      const page = await createPage('Anexos', { content: documentSaying([crypto.randomUUID(), 'Base']) });

      await Promise.all(
        ['Uno', 'Dos'].map((text) =>
          request(testApp.getServer())
            .post(`${pagePath(page.id)}/blocks`)
            .set(asAdmin())
            .send({ blocks: [{ content: [{ text, type: 'text' }], type: 'paragraph' }] })
            .expect(HTTP_CREATED),
        ),
      );

      const texts = JSON.stringify((await getPage(page.id)).content);
      expect(texts).toContain('Base');
      expect(texts).toContain('Uno');
      expect(texts).toContain('Dos');
    });

    it('cuts a version for a content change and restores the page to what a version said, by id', async () => {
      const blockA = crypto.randomUUID();
      const blockB = crypto.randomUUID();
      const page = await createPage('Con versiones', { content: documentSaying([blockA, 'Uno'], [blockB, 'Dos']) });
      await prisma.models.PageVersion.where({ pageId: page.id }).updateAndCount({
        createdAt: new Date(Date.now() - ONE_HOUR_IN_MILLISECONDS),
      });
      await request(testApp.getServer())
        .put(`${pagePath(page.id)}/content`)
        .set(asAdmin())
        .send({ content: documentSaying([blockA, 'Cambiado']) })
        .expect(HTTP_OK);
      const [latest] = await prisma.models.PageVersion.where({ pageId: page.id })
        .orderBy((entry) => entry.version.desc())
        .all();
      expect(latest).toMatchObject({ content: documentSaying([blockA, 'Cambiado']) });

      const restored = await testApp
        .get(PagesService)
        .restoreVersion(page.id, 1, adminId, workspaceId, USER_ROLE.ADMIN);

      expect(restored.isOk()).toBe(true);
      expect((await getPage(page.id)).content).toEqual(documentSaying([blockA, 'Uno'], [blockB, 'Dos']));
      expect((await readBlock(blockB)).alive).toBe(true);
      expect((await readBlock(page.id)).children).toEqual([blockA, blockB]);
    });

    it('says that a version that does not exist is not there', async () => {
      const page = await createPage('Sin esa versión');

      const restored = await testApp
        .get(PagesService)
        .restoreVersion(page.id, 99, adminId, workspaceId, USER_ROLE.ADMIN);

      expect(restored.getError().code).toBe('PAGE_VERSION_NOT_FOUND');
    });
  });

  describe('renaming an option of a collection', () => {
    it('rewrites the value of every row, the locked ones and the ones in the trash too', async () => {
      const collection = await createPage('Estados');
      await request(testApp.getServer())
        .post(`${pagePath(collection.id)}/schema`)
        .set(asAdmin())
        .send({
          properties: [
            { key: 'title', label: 'Título', options: null, required: true, type: DatabasePropertyType.TITLE },
            {
              key: 'status',
              label: 'Estado',
              options: ['todo', 'done'],
              required: false,
              type: DatabasePropertyType.SELECT,
            },
          ],
          views: [],
        })
        .expect(HTTP_CREATED);
      const open = await createPage('Abierta', { parentId: collection.id, propertyValues: { status: 'todo' } });
      const locked = await createPage('Bloqueada', { parentId: collection.id, propertyValues: { status: 'todo' } });
      const trashed = await createPage('Borrada', { parentId: collection.id, propertyValues: { status: 'todo' } });
      await request(testApp.getServer())
        .patch(`${pagePath(locked.id)}/lock`)
        .set(asAdmin())
        .send({ locked: true })
        .expect(HTTP_OK);
      await request(testApp.getServer())
        .post(`${pagePath(trashed.id)}/trash`)
        .set(asAdmin())
        .expect(HTTP_CREATED);

      await request(testApp.getServer())
        .post(`${pagePath(collection.id)}/schema/properties/status/rewrite-option`)
        .set(asAdmin())
        .send({ from: 'todo', to: 'later' })
        .expect(HTTP_CREATED);

      for (const row of [open, locked, trashed]) {
        expect((await readBlock(row.id)).properties).toMatchObject({ values: { status: 'later' } });
      }
      expect((await readBlock(locked.id)).lockedAt).toBeInstanceOf(Date);
    });
  });

  describe('the values of a collection row', () => {
    it('keeps the values of a row in the properties of its block and merges the named ones', async () => {
      const collection = await createPage('Tareas');
      await testApp.get(PageSchemaService).defineSchema({
        pageId: collection.id,
        properties: [
          { key: 'title', label: 'Nombre', options: null, required: true, type: DatabasePropertyType.TITLE },
          { key: 'status', label: 'Estado', options: null, required: false, type: DatabasePropertyType.RICH_TEXT },
          { key: 'notes', label: 'Notas', options: null, required: false, type: DatabasePropertyType.RICH_TEXT },
        ],
        role: USER_ROLE.ADMIN,
        userId: adminId,
        views: [{ configuration: {}, isDefault: true, name: 'Tabla', type: DatabaseViewType.TABLE }],
        workspaceId,
      });
      const row = await createPage('Fila', { parentId: collection.id, propertyValues: { status: 'todo' } });
      expect((await readBlock(row.id)).properties).toEqual({ title: [{ insert: 'Fila' }], values: { status: 'todo' } });

      await request(testApp.getServer())
        .patch(`${pagePath(row.id)}/properties`)
        .set(asAdmin())
        .send({ propertyValues: { notes: 'hola' } })
        .expect(HTTP_OK);

      expect((await readBlock(row.id)).properties).toEqual({
        title: [{ insert: 'Fila' }],
        values: { notes: 'hola', status: 'todo' },
      });
      const rows = await request(testApp.getServer())
        .get(`${pagePath(collection.id)}/rows`)
        .set(asAdmin())
        .expect(HTTP_OK);
      expect((rows.body as { rows: PageResponse[] }).rows.map((entry) => entry.propertyValues)).toEqual([
        { notes: 'hola', status: 'todo' },
      ]);
    });
  });

  describe('deleting forever', () => {
    it('removes the page block with everything below it once the delay passes, and drops it from its parent', async () => {
      const grandparent = await createPage('Abuela de la que se va');
      const blockA = crypto.randomUUID();
      const parent = await createPage('Se va', {
        content: documentSaying([blockA, 'Texto']),
        parentId: grandparent.id,
      });
      const child = await createPage('Se va con ella', { parentId: parent.id });
      await request(testApp.getServer())
        .post(`${pagePath(parent.id)}/trash`)
        .set(asAdmin())
        .expect(HTTP_CREATED);
      await request(testApp.getServer()).delete(pagePath(parent.id)).set(asAdmin()).expect(HTTP_OK);
      const scheduled = await readBlock(parent.id);
      expect(scheduled.purgeAfter).toBeInstanceOf(Date);

      await testApp.get(PagesService).purgeDuePages(new Date());
      expect(await prisma.models.Block.first({ id: parent.id })).not.toBeNull();
      await testApp.get(PagesService).purgeDuePages(afterThePurgeDelay());

      for (const id of [parent.id, child.id, blockA]) expect(await prisma.models.Block.first({ id })).toBeNull();
      expect((await readBlock(grandparent.id)).children).not.toContain(parent.id);
      expect(await prisma.models.PageVersion.where({ pageId: parent.id }).all()).toEqual([]);
      const record = await prisma.models.PagePurge.where({ pageId: parent.id }).select('purgedAt', 'title').first();
      expect(record?.title).toBe('Se va');
      expect(record?.purgedAt).toBeInstanceOf(Date);
    });
  });

  describe('a page with a block closed to a reader', () => {
    const workerGet = (pageId: string) =>
      request(testApp.getServer()).get(pagePath(pageId)).set('Authorization', `Bearer ${workerToken}`);

    const createPageWithClosedBlock = async () => {
      const shown = crypto.randomUUID();
      const secret = crypto.randomUUID();
      const inner = crypto.randomUUID();
      const after = crypto.randomUUID();
      const page = await createPage('Con secreto', {
        content: {
          content: [
            paragraph(shown, 'Visible'),
            { attrs: { id: secret }, content: [paragraph(inner, `Dentro del secreto ${secret}`)], type: 'blockquote' },
            paragraph(after, 'También visible'),
          ],
          schemaVersion: 1,
          type: 'doc',
        },
      });
      await prisma.models.Block.where({ id: secret }).update({
        permissions: [{ principal: { kind: 'user', userId: adminId }, role: BLOCK_ROLE.full }],
      });
      return { after, inner, page, secret, shown };
    };

    it('shows the page without the block and its branch, and never names their ids', async () => {
      const { after, inner, page, secret, shown } = await createPageWithClosedBlock();

      const read = await workerGet(page.id).expect(HTTP_OK);
      const listing = await request(testApp.getServer())
        .get(`/api/v1/spaces/${spaceId}/pages`)
        .set('Authorization', `Bearer ${workerToken}`)
        .expect(HTTP_OK);

      const readText = JSON.stringify((read.body as PageResponse).content);
      for (const text of [secret, inner, 'Dentro del secreto']) expect(readText).not.toContain(text);
      expect(readText).not.toContain('secreto');
      for (const id of [shown, after]) expect(readText).toContain(id);
      const listed = (listing.body as PageResponse[]).find((entry) => entry.id === page.id);
      expect(JSON.stringify(listed?.content)).not.toContain(secret);
      expect(JSON.stringify((await getPage(page.id)).content)).toContain(secret);
    });

    it('leaves the closed block alone when the reader replaces the content they see', async () => {
      const { page, secret, shown } = await createPageWithClosedBlock();

      await request(testApp.getServer())
        .put(`${pagePath(page.id)}/content`)
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ content: documentSaying([shown, 'Cambiado']) })
        .expect(HTTP_OK);

      expect((await readBlock(secret)).alive).toBe(true);
      expect((await readBlock(page.id)).children).toContain(secret);
    });

    it('does not hand the closed block back out of a version', async () => {
      const { page, secret } = await createPageWithClosedBlock();

      const restored = await testApp
        .get(PagesService)
        .restoreVersion(page.id, 1, workerId, workspaceId, USER_ROLE.WORKER);

      expect(restored.isOk()).toBe(true);
      const blocksWithTheText = await prisma.models.Block.where({ type: 'paragraph' })
        .where((block) => block.text.like(`Dentro del secreto ${secret}`))
        .all();
      expect(blocksWithTheText).toHaveLength(1);
      expect(JSON.stringify((await getPage(page.id)).content)).toContain(secret);
    });
  });

  describe('who can read a page', () => {
    it('hides a page whose permissions leave a reader out, in the list and in the page itself', async () => {
      const closed = await createPage('Cerrada');
      await prisma.models.Block.where({ id: closed.id }).update({
        permissions: [{ principal: { kind: 'user', userId: workerId }, role: BLOCK_ROLE.none }],
      });

      const listing = await request(testApp.getServer())
        .get(`/api/v1/spaces/${spaceId}/pages`)
        .set('Authorization', `Bearer ${workerToken}`)
        .expect(HTTP_OK);
      const page = await request(testApp.getServer())
        .get(pagePath(closed.id))
        .set('Authorization', `Bearer ${workerToken}`);

      expect((listing.body as PageResponse[]).map((entry) => entry.id)).not.toContain(closed.id);
      expect(page.status).toBe(HTTP_FORBIDDEN);
    });
  });
});
