import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import { BLOCK_ROLE, type UserRole } from '@neuma/shared';
import request from 'supertest';
import type { PageBlockSearchQuery } from '@/common/types/search.types';
import { SearchService } from '@/modules/search/search.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createBlockFactory } from '../factories/block.factory';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface IdResponse {
  id: string;
}

interface PageHit {
  sourceId: string;
  snippet: string;
  title: string;
}

interface PageSearchResponse {
  items: PageHit[];
  nextCursor?: string;
}

interface Viewer {
  readonly token: string;
  readonly userId: string;
  readonly userRole: UserRole;
}

interface Operation {
  args: unknown;
  command: string;
  path: string[];
  pointer: { id: string; table: 'block' };
}

const PASSWORD = 'plainPassword123';
const HTTP_OK = 200;
const PAGE_SIZE = 2;
const UNIQUE_WORD_LENGTH = 10;
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

const required = <Row>(row: Row | null | undefined, description: string): Row => {
  if (row === null || row === undefined) throw new Error(`Expected ${description} to exist`);
  return row;
};

/** Letters only: a digit or hyphen would split the word and change what "whole word" means. */
const uniqueWord = (): string =>
  Array.from({ length: UNIQUE_WORD_LENGTH }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');

const richTitle = (text: string) => ({ title: [{ insert: text }] });

describe('Search over blocks (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let admin: Viewer;
  let worker: Viewer;
  let workspaceId: string;
  let openSpaceId: string;
  let closedSpaceId: string;
  const marker = uniqueWord();
  const rankTerm = uniqueWord();
  const hiddenTerm = uniqueWord();
  const closedTerm = uniqueWord();
  const pagedTerm = uniqueWord();
  const liveTerm = uniqueWord();
  const headingTerm = uniqueWord();
  const trashedTerm = uniqueWord();

  const ids = {
    accentParagraph: crypto.randomUUID(),
    deadParagraph: crypto.randomUUID(),
    headingParagraph: crypto.randomUUID(),
    hiddenPage: crypto.randomUUID(),
    hiddenParagraph: crypto.randomUUID(),
    hiddenSection: crypto.randomUUID(),
    insideRank: crypto.randomUUID(),
    pagedPage: crypto.randomUUID(),
    plainPage: crypto.randomUUID(),
    rankPage: crypto.randomUUID(),
    trashedChild: crypto.randomUUID(),
    trashedPage: crypto.randomUUID(),
    wholeRank: crypto.randomUUID(),
    wordParagraph: crypto.randomUUID(),
    closedPage: crypto.randomUUID(),
    closedParagraph: crypto.randomUUID(),
    headingOne: crypto.randomUUID(),
    headingTwo: crypto.randomUUID(),
    headingPage: crypto.randomUUID(),
    livePage: crypto.randomUUID(),
  };
  /** Equal ranks, so the id decides the order and the order is known without ranking maths. */
  const pagedIds = Array.from({ length: 5 }, () => crypto.randomUUID()).toSorted();

  const createSpace = async (name: string, visibility: SpaceVisibility): Promise<string> => {
    const response = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name, slug: `${name}-${String(Date.now())}`, visibility })
      .expect(201);
    return (response.body as IdResponse).id;
  };

  const searchPages = async (viewer: Viewer, query: string, extra = ''): Promise<PageSearchResponse> => {
    const response = await request(testApp.getServer())
      .get(`/api/v1/search?query=${encodeURIComponent(query)}${extra}`)
      .set('Authorization', `Bearer ${viewer.token}`)
      .expect(HTTP_OK);
    return response.body as PageSearchResponse;
  };

  const searchBlocks = (viewer: Viewer, query: string, extra: Partial<PageBlockSearchQuery> = {}) =>
    testApp
      .get(SearchService)
      .searchBlocks({ limit: 20, query, userId: viewer.userId, userRole: viewer.userRole, workspaceId, ...extra });

  const pageIdsOf = (body: PageSearchResponse): string[] => body.items.map((item) => item.sourceId);

  const createViewer = async (role: UserRole, label: string): Promise<Viewer> => {
    const email = `search-${label}-${String(Date.now())}-${uniqueWord()}@test.com`;
    await createAccount(testApp, { email, name: `Search ${label}`, password: PASSWORD });
    await prisma.models.User.where({ email }).update({ role });
    const session = await loginUser(testApp, email, PASSWORD);
    const user = required(await prisma.models.User.where({ email }).first(), 'the user');
    return { token: session.accessToken, userId: user.id, userRole: role };
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    admin = await createViewer('ADMIN', 'admin');
    worker = await createViewer('WORKER', 'worker');
    openSpaceId = await createSpace('search-open', SpaceVisibility.PUBLIC_INTERNAL);
    closedSpaceId = await createSpace('search-closed', SpaceVisibility.RESTRICTED);
    workspaceId = required(await prisma.models.Space.where({ id: openSpaceId }).first(), 'the space').workspaceId;

    const blocks = createBlockFactory(prisma.models);
    const open = { createdById: admin.userId, editedById: admin.userId, spaceId: openSpaceId };
    const page = (id: string, title: string, children: string[], extra: object = {}) =>
      blocks.create({
        ...open,
        children,
        id,
        properties: richTitle(title),
        text: title,
        title,
        type: 'page',
        ...extra,
      });
    const paragraph = (id: string, parentId: string, text: string, extra: object = {}) =>
      blocks.create({ ...open, id, parentId, properties: richTitle(text), text, type: 'paragraph', ...extra });

    await page(ids.plainPage, `Plan ${marker}`, [ids.wordParagraph, ids.accentParagraph]);
    await paragraph(ids.wordParagraph, ids.plainPage, `El lanzamiento ${marker} es en marzo`);
    await paragraph(ids.accentParagraph, ids.plainPage, `Café ${marker} con leche`);

    await page(ids.rankPage, 'Ranking', [ids.insideRank, ids.wholeRank]);
    await paragraph(ids.insideRank, ids.rankPage, `pre${rankTerm}post algo mas`);
    await paragraph(ids.wholeRank, ids.rankPage, `${rankTerm} beta`);

    await page(ids.trashedPage, `Papelera ${trashedTerm}`, [ids.trashedChild], {
      lifecycle: 'TRASHED',
    });
    await paragraph(ids.trashedChild, ids.trashedPage, `contenido ${trashedTerm} en la papelera`);
    await page(ids.livePage, 'Viva', [ids.deadParagraph]);
    await paragraph(ids.deadParagraph, ids.livePage, `borrado ${trashedTerm}`, { alive: false });

    await page(ids.hiddenPage, 'Pagina con una seccion privada', [ids.hiddenSection]);
    await blocks.create({
      ...open,
      children: [ids.hiddenParagraph],
      id: ids.hiddenSection,
      parentId: ids.hiddenPage,
      permissions: [{ principal: { kind: 'user', userId: admin.userId }, role: BLOCK_ROLE.full }],
      properties: richTitle('Seccion privada'),
      text: 'Seccion privada',
      type: 'toggle',
    });
    await paragraph(ids.hiddenParagraph, ids.hiddenSection, `reservado ${hiddenTerm}`);

    await blocks.create({
      ...open,
      children: [ids.closedParagraph],
      id: ids.closedPage,
      properties: richTitle(`Cerrada ${closedTerm}`),
      spaceId: closedSpaceId,
      text: `Cerrada ${closedTerm}`,
      type: 'page',
    });
    await blocks.create({
      ...open,
      id: ids.closedParagraph,
      parentId: ids.closedPage,
      properties: richTitle(`contenido ${closedTerm}`),
      spaceId: closedSpaceId,
      text: `contenido ${closedTerm}`,
      type: 'paragraph',
    });

    await page(ids.pagedPage, 'Paginacion', pagedIds);
    for (const id of pagedIds) {
      await paragraph(id, ids.pagedPage, `${pagedTerm} relleno`);
    }

    await page(ids.headingPage, 'Manual', [ids.headingOne, ids.headingTwo, ids.headingParagraph]);
    await blocks.create({
      ...open,
      id: ids.headingOne,
      parentId: ids.headingPage,
      properties: { level: 1, title: [{ insert: 'Instalacion' }] },
      text: 'Instalacion',
      type: 'heading',
    });
    await blocks.create({
      ...open,
      id: ids.headingTwo,
      parentId: ids.headingPage,
      properties: { level: 2, title: [{ insert: 'Requisitos' }] },
      text: 'Requisitos',
      type: 'heading',
    });
    await paragraph(ids.headingParagraph, ids.headingPage, `bajo los requisitos ${headingTerm}`);
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('what is found', () => {
    it('finds a whole word, and the page that holds it', async () => {
      const blocks = await searchBlocks(worker, `lanzamiento ${marker}`);
      const pages = await searchPages(worker, `lanzamiento ${marker}`);

      expect(blocks.items.map((item) => item.blockId)).toEqual([ids.wordParagraph]);
      expect(blocks.items[0]?.pageId).toBe(ids.plainPage);
      expect(blocks.items[0]?.snippet).toContain('<mark>');
      expect(pageIdsOf(pages)).toEqual([ids.plainPage]);
    });

    it('finds what is searched for inside a longer word', async () => {
      const inside = await searchBlocks(worker, 'zamien');
      const insidePages = await searchPages(worker, 'zamien');

      expect(inside.items.map((item) => item.blockId)).toContain(ids.wordParagraph);
      expect(pageIdsOf(insidePages)).toContain(ids.plainPage);
    });

    it('ignores accents in what is stored and in what is typed', async () => {
      const typedWithout = await searchBlocks(worker, `cafe ${marker}`);
      const typedWith = await searchBlocks(worker, `café ${marker}`);

      expect(typedWithout.items.map((item) => item.blockId)).toEqual([ids.accentParagraph]);
      expect(typedWith.items.map((item) => item.blockId)).toEqual([ids.accentParagraph]);
    });

    it('lists a whole-word match before a match inside another word', async () => {
      const blocks = await searchBlocks(worker, rankTerm);

      expect(blocks.items.map((item) => item.blockId)).toEqual([ids.wholeRank, ids.insideRank]);
      const [first, second] = blocks.items;
      expect(required(first, 'the first hit').rank).toBeGreaterThan(required(second, 'the second hit').rank);
    });

    it('names the headings a block sits under', async () => {
      const blocks = await searchBlocks(worker, headingTerm);

      expect(blocks.items[0]?.headingPath).toEqual(['Instalacion', 'Requisitos']);
    });

    it('finds a page by its title', async () => {
      const pages = await searchPages(worker, `Plan ${marker}`);

      expect(pageIdsOf(pages)).toContain(ids.plainPage);
    });
  });

  describe('what is narrowed', () => {
    it('forgives a one-letter slip when the words found nothing', async () => {
      const slipped = `${rankTerm.startsWith('a') ? 'b' : 'a'}${rankTerm.slice(1)}`;
      const blocks = await searchBlocks(worker, slipped);

      expect(blocks.items.map((item) => item.blockId)).toContain(ids.wholeRank);
    });

    it('searches only under a page when asked', async () => {
      const inside = await searchBlocks(worker, rankTerm, { rootPageId: ids.rankPage });
      const elsewhere = await searchBlocks(worker, rankTerm, { rootPageId: ids.plainPage });

      expect(inside.items.map((item) => item.blockId)).toEqual([ids.wholeRank, ids.insideRank]);
      expect(elsewhere.items).toEqual([]);
    });

    it('keeps the blocks of verified pages when asked, and says which pages are verified', async () => {
      await prisma.models.Block.where({ id: ids.plainPage }).update({ verifiedAt: new Date() });

      const verified = await searchBlocks(worker, marker, { verifiedOnly: true });
      const unverified = await searchBlocks(worker, rankTerm, { verifiedOnly: true });

      expect(verified.items.length).toBeGreaterThan(0);
      expect(verified.items.every((item) => item.isPageVerified && item.pageId === ids.plainPage)).toBe(true);
      expect(unverified.items).toEqual([]);
    });

    it('keeps a page a token closes out of the results', async () => {
      const closed = await searchBlocks(worker, rankTerm, {
        tokenScope: {
          allowedPageIds: [],
          closedPageIds: [ids.rankPage],
          closedSpaceIds: [],
          openSpaceIds: [],
          readsEverywhere: true,
        },
      });

      expect(closed.items).toEqual([]);
    });

    it('says which page holds a block, if it is alive and not in the trash', async () => {
      const search = testApp.get(SearchService);

      expect(await search.locateBlock(ids.wordParagraph, workspaceId)).toEqual([ids.plainPage]);
      expect(await search.locateBlock(ids.trashedChild, workspaceId)).toEqual([]);
    });
  });

  describe('what is left out', () => {
    it('leaves out a trashed page and everything under it, and a block that was removed', async () => {
      const blocks = await searchBlocks(admin, trashedTerm);
      const pages = await searchPages(admin, trashedTerm);

      expect(blocks.items).toEqual([]);
      expect(pages.items).toEqual([]);
    });

    it('leaves out a block the reader may not read, and does not reveal its page', async () => {
      const blocks = await searchBlocks(worker, hiddenTerm);
      const pages = await searchPages(worker, hiddenTerm);

      expect(blocks.items).toEqual([]);
      expect(pages.items).toEqual([]);
    });

    it('shows that block to the one it was shared with', async () => {
      const blocks = await searchBlocks(admin, hiddenTerm);

      expect(blocks.items.map((item) => item.blockId)).toEqual([ids.hiddenParagraph]);
      expect(blocks.items[0]?.pageId).toBe(ids.hiddenPage);
    });

    it('finds the page of a block through page search for the one it was shared with, and only for them', async () => {
      const granted = await searchPages(admin, hiddenTerm);
      const notGranted = await searchPages(worker, hiddenTerm);

      expect(pageIdsOf(granted)).toEqual([ids.hiddenPage]);
      expect(notGranted.items).toEqual([]);
    });

    it('leaves out a space the reader is not a member of', async () => {
      const workerBlocks = await searchBlocks(worker, closedTerm);
      const workerPages = await searchPages(worker, closedTerm);
      const adminBlocks = await searchBlocks(admin, closedTerm);

      expect(workerBlocks.items).toEqual([]);
      expect(workerPages.items).toEqual([]);
      expect(adminBlocks.items.map((item) => item.blockId)).toEqual([ids.closedParagraph]);
    });
  });

  describe('paging', () => {
    const collect = async (afterFirstPage: () => Promise<void>): Promise<string[]> => {
      const seen: string[] = [];
      const first = await searchBlocks(worker, pagedTerm, { limit: PAGE_SIZE });
      seen.push(...first.items.map((item) => item.blockId));
      await afterFirstPage();
      let cursor = first.nextCursor;
      while (cursor !== undefined) {
        const next = await searchBlocks(worker, pagedTerm, { cursor, limit: PAGE_SIZE });
        seen.push(...next.items.map((item) => item.blockId));
        cursor = next.nextCursor;
      }
      return seen;
    };

    it('stays consistent when blocks are written between two pages', async () => {
      const blocks = createBlockFactory(prisma.models);
      const lateId = crypto.randomUUID();
      const removedIndex = 3;

      const seen = await collect(async () => {
        await prisma.models.Block.where({ id: pagedIds[removedIndex] ?? '' }).update({ alive: false });
        await blocks.create({
          createdById: admin.userId,
          editedById: admin.userId,
          id: lateId,
          parentId: ids.pagedPage,
          properties: richTitle(`antes${pagedTerm}despues`),
          spaceId: openSpaceId,
          text: `antes${pagedTerm}despues`,
          type: 'paragraph',
        });
      });

      expect(new Set(seen).size).toBe(seen.length);
      const survivors = pagedIds.filter((_id, index) => index !== removedIndex);
      expect(seen).toEqual([...survivors, lateId]);
    });
  });

  describe('paging through more matches than one window', () => {
    const MANY_PAGES = 600;
    const BLOCKS_IN_EACH = 1;
    const BIG_PAGE_SIZE = 20;
    const TRASHED_BLOCKS = 520;
    const manyTerm = uniqueWord();
    const shadowedTerm = uniqueWord();
    const manyPageIds = Array.from({ length: MANY_PAGES }, () => crypto.randomUUID());
    const liveAmongTrashedId = crypto.randomUUID();

    beforeAll(async () => {
      const open = { createdById: admin.userId, editedById: admin.userId, spaceId: openSpaceId };
      const rows: Parameters<PrismaService['models']['Block']['createAndCount']>[0][number][] = [];
      for (const pageId of manyPageIds) {
        const blockIds = Array.from({ length: BLOCKS_IN_EACH }, () => crypto.randomUUID());
        rows.push({
          ...open,
          children: blockIds,
          id: pageId,
          properties: richTitle('Muchas'),
          text: 'Muchas',
          type: 'page',
        });
        for (const id of blockIds) {
          const text = `${manyTerm} relleno`;
          rows.push({ ...open, id, parentId: pageId, properties: richTitle(text), text, type: 'paragraph' });
        }
      }
      const trashedPageId = crypto.randomUUID();
      const trashedChildren = Array.from({ length: TRASHED_BLOCKS }, () => crypto.randomUUID());
      rows.push({
        ...open,
        children: trashedChildren,
        id: trashedPageId,
        lifecycle: 'TRASHED',
        properties: richTitle('Papelera grande'),
        text: 'Papelera grande',
        type: 'page',
      });
      for (const id of trashedChildren) {
        const text = `${shadowedTerm} relleno`;
        rows.push({ ...open, id, parentId: trashedPageId, properties: richTitle(text), text, type: 'paragraph' });
      }
      rows.push({
        ...open,
        id: liveAmongTrashedId,
        parentId: ids.plainPage,
        properties: richTitle(`antes${shadowedTerm}despues`),
        text: `antes${shadowedTerm}despues`,
        type: 'paragraph',
      });
      await prisma.models.Block.createAndCount(rows);
    });

    it('returns every page exactly once when more than five hundred blocks match', async () => {
      const seen: string[] = [];
      let cursor: string | undefined;
      do {
        const next = await searchPages(
          worker,
          manyTerm,
          `&limit=${String(BIG_PAGE_SIZE)}${cursor === undefined ? '' : `&cursor=${cursor}`}`,
        );
        seen.push(...pageIdsOf(next));
        cursor = next.nextCursor;
      } while (cursor !== undefined);

      expect(new Set(seen).size).toBe(seen.length);
      expect(seen.toSorted()).toEqual(manyPageIds.toSorted());
    });

    it('returns every block exactly once when more than five hundred match', async () => {
      const seen: string[] = [];
      let cursor: string | undefined;
      do {
        const next = await searchBlocks(worker, manyTerm, { ...(cursor === undefined ? {} : { cursor }), limit: 50 });
        seen.push(...next.items.map((item) => item.blockId));
        cursor = next.nextCursor;
      } while (cursor !== undefined);

      expect(new Set(seen).size).toBe(seen.length);
      expect(seen).toHaveLength(MANY_PAGES * BLOCKS_IN_EACH);
    });

    it('keeps looking past a stretch of matches that are all in the trash', async () => {
      const blocks = await searchBlocks(worker, shadowedTerm);

      expect(blocks.items.map((item) => item.blockId)).toEqual([liveAmongTrashedId]);
    });
  });

  describe('a page whose best matches the reader may not read', () => {
    const FILLER_PAGES = 400;
    const FILLER_PAGE_SIZE = 20;
    const mixedTerm = uniqueWord();
    const mixedPageId = crypto.randomUUID();
    const hiddenSectionId = crypto.randomUUID();
    const hiddenBlockId = crypto.randomUUID();
    const readableBlockId = crypto.randomUUID();
    const fillerPageIds = Array.from({ length: FILLER_PAGES }, () => crypto.randomUUID());

    beforeAll(async () => {
      const open = { createdById: admin.userId, editedById: admin.userId, spaceId: openSpaceId };
      const rows: Parameters<PrismaService['models']['Block']['createAndCount']>[0][number][] = [];
      rows.push({
        ...open,
        children: [hiddenSectionId, readableBlockId],
        id: mixedPageId,
        properties: richTitle('Mixta'),
        text: 'Mixta',
        type: 'page',
      });
      rows.push({
        ...open,
        children: [hiddenBlockId],
        id: hiddenSectionId,
        parentId: mixedPageId,
        permissions: [{ principal: { kind: 'user', userId: admin.userId }, role: BLOCK_ROLE.full }],
        properties: richTitle('Reservada'),
        text: 'Reservada',
        type: 'toggle',
      });
      rows.push({
        ...open,
        id: hiddenBlockId,
        parentId: hiddenSectionId,
        properties: richTitle(mixedTerm),
        text: mixedTerm,
        type: 'paragraph',
      });
      const readableText = `una nota larga sobre ${mixedTerm} con muchas palabras de relleno que bajan el puesto de esta coincidencia`;
      rows.push({
        ...open,
        id: readableBlockId,
        parentId: mixedPageId,
        properties: richTitle(readableText),
        text: readableText,
        type: 'paragraph',
      });
      for (const pageId of fillerPageIds) {
        const blockId = crypto.randomUUID();
        const text = `${mixedTerm} relleno`;
        rows.push({
          ...open,
          children: [blockId],
          id: pageId,
          properties: richTitle('Relleno'),
          text: 'Relleno',
          type: 'page',
        });
        rows.push({ ...open, id: blockId, parentId: pageId, properties: richTitle(text), text, type: 'paragraph' });
      }
      await prisma.models.Block.createAndCount(rows);
    });

    const collectPages = async (viewer: Viewer): Promise<string[]> => {
      const seen: string[] = [];
      let cursor: string | undefined;
      do {
        const next = await searchPages(
          viewer,
          mixedTerm,
          `&limit=${String(FILLER_PAGE_SIZE)}${cursor === undefined ? '' : `&cursor=${cursor}`}`,
        );
        seen.push(...pageIdsOf(next));
        cursor = next.nextCursor;
      } while (cursor !== undefined);
      return seen;
    };

    it('still finds the page through the match the reader may read, ranked far below the hidden one', async () => {
      const seen = await collectPages(worker);

      expect(new Set(seen).size).toBe(seen.length);
      expect(seen.toSorted()).toEqual([mixedPageId, ...fillerPageIds].toSorted());
    });

    it('gives a full page of results even when the best matches are all hidden from the reader', async () => {
      const first = await searchPages(worker, mixedTerm, `&limit=${String(FILLER_PAGE_SIZE)}`);

      expect(first.items).toHaveLength(FILLER_PAGE_SIZE);
      expect(first.nextCursor).toBeDefined();
    });
  });

  describe('freshness', () => {
    it('finds a change as soon as its transaction commits, with nothing in between', async () => {
      const blockId = crypto.randomUUID();
      const operations: Operation[] = [
        {
          args: {
            id: blockId,
            parentId: ids.plainPage,
            properties: richTitle(`recien ${liveTerm}`),
            type: 'paragraph',
          },
          command: 'set',
          path: [],
          pointer: { id: blockId, table: 'block' },
        },
        {
          args: { id: blockId },
          command: 'listAfter',
          path: ['children'],
          pointer: { id: ids.plainPage, table: 'block' },
        },
      ];

      await request(testApp.getServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ transactions: [{ id: crypto.randomUUID(), operations, spaceId: openSpaceId }] })
        .expect(HTTP_OK);
      const found = await searchBlocks(worker, liveTerm);

      expect(found.items.map((item) => item.blockId)).toEqual([blockId]);
    });
  });
});
