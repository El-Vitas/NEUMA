import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
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

interface Destinations {
  readonly parentTitle: string | null;
  readonly pages: readonly { readonly id: string; readonly spaceId: string; readonly title: string }[];
  readonly spaces: readonly { readonly id: string; readonly name: string }[];
}

const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_FORBIDDEN = 403;
const PER_SPACE_CAP = 20;
const SEARCH_CAP = 30;
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

/** Letters only, so the word is one token for the search whatever the digits around it. */
const uniqueWord = (): string =>
  Array.from({ length: 10 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');

const documentSaying = (text: string): PageContent => ({
  content: [{ attrs: { id: crypto.randomUUID() }, content: [{ text, type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
});

describe('Move destinations on demand (Integration)', () => {
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

  const listDestinations = async (user: SeededUser, pageId: string, query?: string): Promise<Destinations> => {
    const response = await api()
      .get(`/api/v1/pages/move-destinations/${pageId}`)
      .query(query === undefined ? {} : { query })
      .set(as(user))
      .expect(HTTP_OK);
    return response.body as Destinations;
  };

  const idsOf = (destinations: Destinations): string[] => destinations.pages.map((page) => page.id);

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    admin = await createSeededUser(testApp, 'Move Admin', 'ADMIN');
    worker = await createSeededUser(testApp, 'Move Worker', 'WORKER');
    spaceId = await createSeededSpace(testApp, admin.token, SpaceVisibility.PUBLIC_INTERNAL);
    otherSpaceId = await createSeededSpace(testApp, admin.token, SpaceVisibility.PUBLIC_INTERNAL);
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('where the page is now', () => {
    it('names the page it hangs from, so a closed list can say where it is', async () => {
      const parent = await createPage('Madre actual');
      const child = await createPage('Hija actual', parent);

      const nested = await listDestinations(admin, child);
      const atTheTop = await listDestinations(admin, parent);

      expect(nested.parentTitle).toBe('Madre actual');
      expect(atTheTop.parentTitle).toBeNull();
    });
  });

  describe('without a query', () => {
    it('lists the spaces and the top of each, never the page itself', async () => {
      const moved = await createPage('A mover');
      const sibling = await createPage('Vecina');
      const elsewhere = await createPage('En otro espacio', undefined, otherSpaceId);

      const destinations = await listDestinations(admin, moved);

      expect(destinations.spaces.map((space) => space.id)).toContain(spaceId);
      expect(destinations.spaces.map((space) => space.id)).toContain(otherSpaceId);
      expect(idsOf(destinations)).toContain(sibling);
      expect(idsOf(destinations)).toContain(elsewhere);
      expect(idsOf(destinations)).not.toContain(moved);
    });

    it('lists only a bounded number of pages of each space, not the whole space', async () => {
      const crowded = await createSeededSpace(testApp, admin.token, SpaceVisibility.PUBLIC_INTERNAL);
      const moved = await createPage('Pagina que se mueve', undefined, crowded);
      for (let index = 0; index < PER_SPACE_CAP + 5; index += 1) {
        await createPage(`Hermana ${String(index)}`, undefined, crowded);
      }

      const destinations = await listDestinations(admin, moved);

      expect(destinations.pages.filter((page) => page.spaceId === crowded)).toHaveLength(PER_SPACE_CAP);
    });

    it('does not list a page the reader cannot open', async () => {
      const moved = await createPage('Movida por el usuario');
      const hidden = await createPage('Reservada para administradores');
      await prisma.models.Block.where({ id: hidden }).update({ permissions: onlyUserPermissions(admin.id) });

      const asWorker = await listDestinations(worker, moved);
      const asAdmin = await listDestinations(admin, moved);

      expect(idsOf(asWorker)).not.toContain(hidden);
      expect(idsOf(asAdmin)).toContain(hidden);
    });
  });

  describe('with a query', () => {
    it('finds a page deep in the tree of another space', async () => {
      const word = uniqueWord();
      const moved = await createPage('Origen de la busqueda');
      const top = await createPage('Nivel uno', undefined, otherSpaceId);
      const middle = await createPage('Nivel dos', top, otherSpaceId);
      const deep = await createPage(`Destino ${word}`, middle, otherSpaceId);

      const destinations = await listDestinations(admin, moved, word);

      expect(idsOf(destinations)).toEqual([deep]);
      expect(destinations.pages[0]?.spaceId).toBe(otherSpaceId);
    });

    it('leaves out the page and everything under it, which it cannot be moved into', async () => {
      const word = uniqueWord();
      const moved = await createPage(`Rama ${word}`);
      const child = await createPage(`Hija ${word}`, moved);
      const grandchild = await createPage(`Nieta ${word}`, child);
      const outside = await createPage(`Fuera ${word}`);

      const destinations = await listDestinations(admin, moved, word);

      expect(idsOf(destinations)).toEqual([outside]);
      expect(idsOf(destinations)).not.toContain(grandchild);
    });

    it('still offers the pages outside the branch when the branch alone fills every place a search has', async () => {
      const word = uniqueWord();
      const moved = await createPage(`${word} ${word} ${word}`);
      for (let index = 0; index < SEARCH_CAP + 5; index += 1) await createPage(`${word} ${word} ${word}`, moved);
      const outside = await createPage(`Una nota larga y poco enfocada que menciona ${word} de pasada`);

      const destinations = await listDestinations(admin, moved, word);

      expect(idsOf(destinations)).toEqual([outside]);
    });

    it('does not offer a page the reader cannot open', async () => {
      const word = uniqueWord();
      const moved = await createPage('Origen privado');
      const open = await createPage(`Abierta ${word}`);
      const hidden = await createPage(`Reservada ${word}`);
      await prisma.models.Block.where({ id: hidden }).update({ permissions: onlyUserPermissions(admin.id) });

      const asWorker = await listDestinations(worker, moved, word);

      expect(idsOf(asWorker)).toEqual([open]);
    });

    it('does not offer a page in the trash', async () => {
      const word = uniqueWord();
      const moved = await createPage('Origen y papelera');
      const trashed = await createPage(`Descartada ${word}`);
      await prisma.models.Block.where({ id: trashed }).update({ lifecycle: 'TRASHED' });

      const destinations = await listDestinations(admin, moved, word);

      expect(idsOf(destinations)).toEqual([]);
    });
  });

  it('refuses a page the reader cannot open', async () => {
    const hidden = await createPage('Cerrada al movedor');
    await prisma.models.Block.where({ id: hidden }).update({ permissions: onlyUserPermissions(admin.id) });

    await api().get(`/api/v1/pages/move-destinations/${hidden}`).set(as(worker)).expect(HTTP_FORBIDDEN);
  });
});
