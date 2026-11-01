import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { DatabasePropertyType, SpaceVisibility } from '@neuma/db';
import type { PageContent } from '@neuma/shared';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import {
  createSeededSpace,
  createSeededUser,
  onlyUserPermissions,
  type SeededUser,
} from '../helpers/block-access.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface TreeEntry {
  readonly canEdit: boolean;
  readonly hasChildren: boolean;
  readonly hasOwnPermissions: boolean;
  readonly icon: unknown;
  readonly id: string;
  readonly isCollection: boolean;
  readonly lifecycle: string;
  readonly order: number;
  readonly parentId: string | null;
  readonly title: string;
  readonly version: number;
}

interface TreeChildren {
  readonly entries: readonly TreeEntry[];
  readonly total: number;
}

interface PathLevel extends TreeChildren {
  readonly parentId: string | null;
  readonly skip: number;
}

interface PathBody {
  readonly ancestors: readonly {
    readonly id: string | null;
    readonly isReadable: boolean;
    readonly title: string | null;
  }[];
  readonly levels: readonly PathLevel[];
  readonly page: TreeEntry | null;
}

const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_FORBIDDEN = 403;
const WINDOW = 100;

const documentSaying = (text: string): PageContent => ({
  content: [{ attrs: { id: crypto.randomUUID() }, content: [{ text, type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
});

describe('The page tree on demand (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let admin: SeededUser;
  let worker: SeededUser;
  let spaceId: string;
  let otherSpaceId: string;

  const as = (user: SeededUser) => ({ Authorization: `Bearer ${user.token}`, 'x-mutation-id': crypto.randomUUID() });
  const api = () => request(testApp.getServer());

  const createPage = async (title: string, parentId?: string, space = spaceId): Promise<string> => {
    const response = await api()
      .post(`/api/v1/spaces/${space}/pages`)
      .set(as(admin))
      .send({ content: documentSaying(title), parentId, title })
      .expect(HTTP_CREATED);
    return (response.body as { id: string }).id;
  };

  const makeCollection = async (pageId: string): Promise<void> => {
    await api()
      .post(`/api/v1/spaces/${spaceId}/pages/${pageId}/schema`)
      .set(as(admin))
      .send({
        properties: [{ key: 'title', label: 'Title', options: null, required: true, type: DatabasePropertyType.TITLE }],
        views: [],
      })
      .expect(HTTP_CREATED);
  };

  const readTree = async (user: SeededUser, parentId?: string, skip = 0, take = WINDOW): Promise<TreeChildren> => {
    const response = await api()
      .get(`/api/v1/spaces/${spaceId}/pages/tree`)
      .query({ parentId, skip, take })
      .set(as(user))
      .expect(HTTP_OK);
    return response.body as TreeChildren;
  };

  const titlesOf = (listing: TreeChildren): string[] => listing.entries.map((entry) => entry.title);

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    admin = await createSeededUser(testApp, 'Tree Admin', 'ADMIN');
    worker = await createSeededUser(testApp, 'Tree Worker', 'WORKER');
    spaceId = await createSeededSpace(testApp, admin.token, SpaceVisibility.PUBLIC_INTERNAL);
    otherSpaceId = await createSeededSpace(testApp, admin.token, SpaceVisibility.PUBLIC_INTERNAL);
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('GET spaces/:spaceId/pages/tree', () => {
    it('lists the top of the space in its order with whether each page has children', async () => {
      const first = await createPage('Raiz A');
      const second = await createPage('Raiz B');
      await createPage('Hija de A', first);

      const roots = await readTree(admin);

      expect(titlesOf(roots)).toEqual(['Raiz A', 'Raiz B']);
      expect(roots.entries.map((entry) => entry.id)).toEqual([first, second]);
      expect(roots.entries.map((entry) => entry.hasChildren)).toEqual([true, false]);
      expect(roots.entries.map((entry) => entry.order)).toEqual([0, 1]);
      expect(roots.total).toBe(2);
    });

    it('lists the pages under a page, and carries what the sidebar draws without the content', async () => {
      const parent = await createPage('Padre');
      const child = await createPage('Hijo uno', parent);
      await createPage('Hijo dos', parent);

      const children = await readTree(admin, parent);

      expect(titlesOf(children)).toEqual(['Hijo uno', 'Hijo dos']);
      expect(children.entries[0]).toMatchObject({
        hasChildren: false,
        hasOwnPermissions: false,
        id: child,
        isCollection: false,
        lifecycle: 'ACTIVE',
        parentId: parent,
      });
      expect(Object.keys(children.entries[0] ?? {})).not.toContain('content');
    });

    it('answers in windows with the total of readable pages', async () => {
      const parent = await createPage('Ventanas');
      for (const index of [1, 2, 3, 4, 5]) await createPage(`Pagina ${String(index)}`, parent);

      const firstWindow = await readTree(admin, parent, 0, 2);
      const lastWindow = await readTree(admin, parent, 4, 2);

      expect(titlesOf(firstWindow)).toEqual(['Pagina 1', 'Pagina 2']);
      expect(titlesOf(lastWindow)).toEqual(['Pagina 5']);
      expect(firstWindow.total).toBe(5);
      expect(lastWindow.entries[0]?.order).toBe(4);
    });

    it('marks a collection and never lists its rows', async () => {
      const collection = await createPage('Tareas');
      await makeCollection(collection);
      await createPage('Fila 1', collection);

      const roots = await readTree(admin);
      const listed = roots.entries.find((entry) => entry.id === collection);
      const rows = await readTree(admin, collection);

      expect(listed).toMatchObject({ hasChildren: false, isCollection: true });
      expect(rows).toMatchObject({ entries: [], total: 0 });
    });

    it('leaves out pages in the trash and does not count them', async () => {
      const parent = await createPage('Con papelera');
      const kept = await createPage('Queda', parent);
      const trashed = await createPage('Se va', parent);
      await api().post(`/api/v1/spaces/${spaceId}/pages/${trashed}/trash`).set(as(admin)).expect(HTTP_CREATED);

      const children = await readTree(admin, parent);

      expect(children.entries.map((entry) => entry.id)).toEqual([kept]);
      expect(children.total).toBe(1);
    });

    it('does not show, count or flag a page the reader cannot open', async () => {
      const parent = await createPage('Con reservada');
      const open = await createPage('Abierta', parent);
      const hidden = await createPage('Reservada', parent);
      await prisma.models.Block.where({ id: hidden }).update({ permissions: onlyUserPermissions(admin.id) });
      const lonely = await createPage('Solo reservada');
      const lonelyChild = await createPage('Unica hija', lonely);
      await prisma.models.Block.where({ id: lonelyChild }).update({ permissions: onlyUserPermissions(admin.id) });

      const asWorker = await readTree(worker, parent);
      const asAdmin = await readTree(admin, parent);
      const workerRoots = await readTree(worker);
      const adminRoots = await readTree(admin);

      expect(asWorker.entries.map((entry) => entry.id)).toEqual([open]);
      expect(asWorker.total).toBe(1);
      expect(asAdmin.total).toBe(2);
      expect(workerRoots.entries.find((entry) => entry.id === lonely)?.hasChildren).toBe(false);
      expect(adminRoots.entries.find((entry) => entry.id === lonely)?.hasChildren).toBe(true);
      expect(asAdmin.entries.find((entry) => entry.id === hidden)?.hasOwnPermissions).toBe(true);
    });

    it('says per page whether the reader may create pages under it, by the role the create path checks', async () => {
      const parent = await createPage('Con roles');
      const open = await createPage('Editable', parent);
      const readOnly = await createPage('Solo lectura', parent);
      const locked = await createPage('Bloqueada', parent);
      await prisma.models.Block.where({ id: readOnly }).update({
        permissions: [
          { principal: { kind: 'user', userId: admin.id }, role: 'full' },
          { principal: { kind: 'space' }, role: 'reader' },
        ],
      });
      await prisma.models.Block.where({ id: locked }).update({ lockedAt: new Date() });

      const asWorker = await readTree(worker, parent);
      const asAdmin = await readTree(admin, parent);

      const canEditOf = (body: TreeChildren, id: string) => body.entries.find((entry) => entry.id === id)?.canEdit;
      expect(canEditOf(asWorker, open)).toBe(true);
      expect(canEditOf(asWorker, readOnly)).toBe(false);
      expect(canEditOf(asWorker, locked)).toBe(false);
      expect(canEditOf(asAdmin, readOnly)).toBe(true);
    });

    it('does not list a space the reader cannot read', async () => {
      const spaces = (await api().get('/api/v1/spaces').set(as(admin)).expect(HTTP_OK)).body as {
        id: string;
        ownerId: string | null;
        visibility: string;
      }[];
      const privateSpace =
        spaces.find((space) => space.visibility === 'PRIVATE' && space.ownerId === admin.id)?.id ?? '';
      await createPage('Intima', undefined, privateSpace);

      const response = await api().get(`/api/v1/spaces/${privateSpace}/pages/tree`).set(as(worker)).expect(HTTP_OK);

      expect(response.body).toMatchObject({ entries: [], total: 0 });
    });

    it('rejects a window beyond the maximum', async () => {
      await api().get(`/api/v1/spaces/${spaceId}/pages/tree`).query({ take: 201 }).set(as(admin)).expect(400);
    });
  });

  describe('GET spaces/:spaceId/pages/:pageId/path', () => {
    it('answers the ancestors and, for each level, the window that holds the next page', async () => {
      const top = await createPage('Tope');
      const middle = await createPage('Medio', top);
      const leaf = await createPage('Hoja', middle);

      const response = await api().get(`/api/v1/spaces/${spaceId}/pages/${leaf}/path`).set(as(admin)).expect(HTTP_OK);
      const body = response.body as PathBody;

      expect(body.ancestors.map((ancestor) => ancestor.id)).toEqual([top, middle]);
      expect(body.levels.map((level) => level.parentId)).toEqual([null, top, middle]);
      expect(body.levels[2]?.entries.map((entry) => entry.id)).toContain(leaf);
      expect(body.page?.id).toBe(leaf);
    });

    it('opens the window of a long list at the page asked for', async () => {
      const parent = await createPage('Larga');
      const children: string[] = [];
      for (const index of Array.from({ length: 105 }, (_, position) => position)) {
        children.push(await createPage(`Hija ${String(index)}`, parent));
      }
      const target = children[102] ?? '';

      const response = await api().get(`/api/v1/spaces/${spaceId}/pages/${target}/path`).set(as(admin)).expect(HTTP_OK);
      const level = (response.body as PathBody).levels.find((candidate) => candidate.parentId === parent);

      expect(level?.skip).toBe(100);
      expect(level?.entries.map((entry) => entry.id)).toContain(target);
      expect(level?.total).toBe(105);
    });

    it('still answers the page when it is in the trash, and its place', async () => {
      const parent = await createPage('Padre de la borrada');
      const page = await createPage('Borrada', parent);
      await api().post(`/api/v1/spaces/${spaceId}/pages/${page}/trash`).set(as(admin)).expect(HTTP_CREATED);

      const response = await api().get(`/api/v1/spaces/${spaceId}/pages/${page}/path`).set(as(admin)).expect(HTTP_OK);
      const body = response.body as PathBody;

      expect(body.page).toMatchObject({ id: page, lifecycle: 'TRASHED' });
      expect(body.ancestors.map((ancestor) => ancestor.id)).toEqual([parent]);
    });

    it('does not name an ancestor the reader cannot open', async () => {
      const top = await createPage('Reservada arriba');
      const child = await createPage('Visible abajo', top);
      await prisma.models.Block.where({ id: top }).update({ permissions: onlyUserPermissions(admin.id) });
      await prisma.models.Block.where({ id: child }).update({
        permissions: [
          ...onlyUserPermissions(admin.id),
          { principal: { kind: 'user', userId: worker.id }, role: 'read' },
        ],
      });

      const response = await api().get(`/api/v1/spaces/${spaceId}/pages/${child}/path`).set(as(worker));
      const body = response.body as PathBody;

      expect(JSON.stringify(body)).not.toContain('Reservada arriba');
      expect(JSON.stringify(body)).not.toContain(top);
    });

    it('answers not found for a page the reader cannot open', async () => {
      const hidden = await createPage('Cerrada del todo');
      await prisma.models.Block.where({ id: hidden }).update({ permissions: onlyUserPermissions(admin.id) });

      await api().get(`/api/v1/spaces/${spaceId}/pages/${hidden}/path`).set(as(worker)).expect(HTTP_FORBIDDEN);
    });
  });

  describe('GET spaces/:spaceId/pages/:pageId/ancestors', () => {
    it('answers only the chain above a page, topmost first', async () => {
      const top = await createPage('Cadena arriba');
      const leaf = await createPage('Cadena abajo', top);

      const response = await api()
        .get(`/api/v1/spaces/${spaceId}/pages/${leaf}/ancestors`)
        .set(as(admin))
        .expect(HTTP_OK);

      expect(response.body).toEqual({
        ancestors: [expect.objectContaining({ id: top, isReadable: true, title: 'Cadena arriba' })],
      });
    });
  });

  describe('POST pages/lookup', () => {
    it('answers title, icon and place of many pages in one request, across spaces', async () => {
      const here = await createPage('Aqui');
      const there = await createPage('Alla', undefined, otherSpaceId);

      const response = await api()
        .post('/api/v1/pages/lookup')
        .set(as(admin))
        .send({ ids: [here, there] })
        .expect(HTTP_OK);
      const pages = (response.body as { pages: { id: string; spaceId: string; title: string }[] }).pages;

      expect(pages.map((page) => [page.id, page.title, page.spaceId]).sort()).toEqual(
        [
          [here, 'Aqui', spaceId],
          [there, 'Alla', otherSpaceId],
        ].sort(),
      );
    });

    it('answers a missing page and a closed one the same way: absent', async () => {
      const hidden = await createPage('No me ves');
      await prisma.models.Block.where({ id: hidden }).update({ permissions: onlyUserPermissions(admin.id) });
      const missing = crypto.randomUUID();

      const response = await api()
        .post('/api/v1/pages/lookup')
        .set(as(worker))
        .send({ ids: [hidden, missing] })
        .expect(HTTP_OK);

      expect(response.body).toEqual({ pages: [] });
    });

    it('rejects more than 100 ids', async () => {
      const ids = Array.from({ length: 101 }, () => crypto.randomUUID());
      await api().post('/api/v1/pages/lookup').set(as(admin)).send({ ids }).expect(400);
    });
  });

  describe('POST pages/lookup-content', () => {
    it('answers the document of the pages asked for and only the ones the reader may open', async () => {
      const open = await createPage('Con texto');
      const hidden = await createPage('Texto cerrado');
      await prisma.models.Block.where({ id: hidden }).update({ permissions: onlyUserPermissions(admin.id) });

      const response = await api()
        .post('/api/v1/pages/lookup-content')
        .set(as(worker))
        .send({ ids: [open, hidden] })
        .expect(HTTP_OK);
      const pages = (response.body as { pages: { content: PageContent; id: string }[] }).pages;

      expect(pages.map((page) => page.id)).toEqual([open]);
      expect(JSON.stringify(pages[0]?.content)).toContain('Con texto');
    });

    it('rejects more than 20 ids', async () => {
      const ids = Array.from({ length: 21 }, () => crypto.randomUUID());
      await api().post('/api/v1/pages/lookup-content').set(as(admin)).send({ ids }).expect(400);
    });
  });

  describe('GET spaces/:spaceId/pages/recent', () => {
    it('lists the pages edited last, newest first, up to the cap', async () => {
      const recentSpace = await createSeededSpace(testApp, admin.token, SpaceVisibility.PUBLIC_INTERNAL);
      const older = await createPage('Antigua', undefined, recentSpace);
      const newer = await createPage('Nueva', undefined, recentSpace);
      await prisma.models.Block.where({ id: older }).update({ editedAt: new Date(Date.now() - 60_000) });

      const response = await api()
        .get(`/api/v1/spaces/${recentSpace}/pages/recent`)
        .query({ take: 5 })
        .set(as(admin))
        .expect(HTTP_OK);
      const entries = (response.body as { entries: { id: string; updatedByName: string | null }[] }).entries;

      expect(entries.map((entry) => entry.id)).toEqual([newer, older]);
      expect(entries[0]?.updatedByName).toBe('Tree Admin');
    });

    it('does not list a page the reader cannot open', async () => {
      const recentSpace = await createSeededSpace(testApp, admin.token, SpaceVisibility.PUBLIC_INTERNAL);
      const open = await createPage('Visible reciente', undefined, recentSpace);
      const hidden = await createPage('Oculta reciente', undefined, recentSpace);
      await prisma.models.Block.where({ id: hidden }).update({ permissions: onlyUserPermissions(admin.id) });

      const response = await api().get(`/api/v1/spaces/${recentSpace}/pages/recent`).set(as(worker)).expect(HTTP_OK);

      expect((response.body as { entries: { id: string }[] }).entries.map((entry) => entry.id)).toEqual([open]);
    });
  });

  describe('recent pages and blocks the reader cannot open', () => {
    it('does not show who edited a hidden block, nor when', async () => {
      const recentSpace = await createSeededSpace(testApp, admin.token, SpaceVisibility.PUBLIC_INTERNAL);
      const page = await createPage('Con bloque oculto', undefined, recentSpace);
      const longAgo = new Date(Date.now() - 3_600_000);
      await prisma.models.Block.where({ id: page }).update({ editedAt: longAgo, editedById: worker.id });
      const [paragraph] = await prisma.models.Block.select('id').where({ parentId: page }).all();
      if (paragraph === undefined) throw new Error('The page has no content block');
      await prisma.models.Block.where({ id: paragraph.id }).update({
        editedAt: new Date(),
        editedById: admin.id,
        permissions: onlyUserPermissions(admin.id),
      });

      const response = await api().get(`/api/v1/spaces/${recentSpace}/pages/recent`).set(as(worker)).expect(HTTP_OK);
      const [entry] = (response.body as { entries: { id: string; updatedAt: string; updatedByName: string }[] })
        .entries;

      expect(entry?.id).toBe(page);
      expect(entry?.updatedByName).toBe('Tree Worker');
      expect(new Date(entry?.updatedAt ?? '').getTime()).toBe(longAgo.getTime());
    });
  });

  describe('GET pages/trash', () => {
    it('answers in windows with the total', async () => {
      const trashSpace = await createSeededSpace(testApp, admin.token, SpaceVisibility.PUBLIC_INTERNAL);
      for (const index of [1, 2, 3]) {
        const page = await createPage(`Borrada ${String(index)}`, undefined, trashSpace);
        await api().post(`/api/v1/spaces/${trashSpace}/pages/${page}/trash`).set(as(admin)).expect(HTTP_CREATED);
      }

      const response = await api()
        .get('/api/v1/pages/trash')
        .query({ skip: 1, spaceId: trashSpace, take: 1 })
        .set(as(admin))
        .expect(HTTP_OK);
      const body = response.body as { items: { title: string }[]; total: number };

      expect(body.total).toBe(3);
      expect(body.items).toHaveLength(1);
    });
  });
});
