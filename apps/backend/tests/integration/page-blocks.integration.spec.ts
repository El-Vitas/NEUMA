import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@company-brain/db';
import type { PageContent, UserRole } from '@company-brain/shared';
import request from 'supertest';
import type { SearchTokenScope } from '@/common/types/search.types';
import { PageBlockRepository } from '@/modules/search/infrastructure/persistence/page-block.repository';
import { SearchService } from '@/modules/search/search.service';
import type { PageBlockSearchQuery } from '@/modules/search/types/page-block.types';
import { PrismaService } from '@/prisma/prisma.service';
import { loginUser, registerUser } from '../helpers/auth.helper';
import { drainSearchProjection } from '../helpers/search.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface IdResponse {
  id: string;
}

interface Reader {
  readonly userId: string;
  readonly userRole: UserRole;
}

const text = (value: string) => ({ text: value, type: 'text' as const });

/** Una página escrita como la manda la API: sin ids en sus bloques. */
const pageWithoutIds = (...blocks: readonly unknown[]): unknown => ({ content: blocks, schemaVersion: 1, type: 'doc' });

const closedNowhere: SearchTokenScope = {
  allowedPageIds: [],
  closedPageIds: [],
  closedSpaceIds: [],
  openSpaceIds: [],
  readsEverywhere: true,
};

describe('Page blocks: projected, searched and pointed at (Integration)', () => {
  let testApp: TestApp;
  let adminToken: string;
  let admin: Reader;
  let outsider: Reader;
  let workspaceId: string;
  let spaceId: string;
  let term: string;
  let rootPageId: string;
  let childPageId: string;
  let otherPageId: string;

  const createPage = async (title: string, content: unknown, parentId?: string): Promise<string> => {
    const response = await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ content, title, ...(parentId === undefined ? {} : { parentId }) })
      .expect(201);
    return (response.body as IdResponse).id;
  };

  const searchBlocks = (reader: Reader, query: string, extra: Partial<PageBlockSearchQuery> = {}) =>
    testApp.get(SearchService).searchBlocks({ limit: 20, query, workspaceId, ...reader, ...extra });

  const readStoredContent = async (pageId: string): Promise<PageContent> => {
    const page = await testApp.get(PrismaService).page.findUniqueOrThrow({ where: { id: pageId } });
    return page.content as PageContent;
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    const timestamp = String(Date.now());
    const password = 'plainPassword123';
    const adminEmail = `blocks-admin-${timestamp}@test.com`;
    const outsiderEmail = `blocks-outsider-${timestamp}@test.com`;
    const prisma = testApp.get(PrismaService);
    term = `Quillhaven${timestamp}`;

    await registerUser(testApp, { email: adminEmail, name: 'Blocks Admin', password });
    await registerUser(testApp, { email: outsiderEmail, name: 'Blocks Outsider', password });
    await prisma.user.update({ data: { role: 'ADMIN' }, where: { email: adminEmail } });
    adminToken = (await loginUser(testApp, adminEmail, password)).accessToken;
    const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });
    const outsiderUser = await prisma.user.findUniqueOrThrow({ where: { email: outsiderEmail } });
    admin = { userId: adminUser.id, userRole: 'ADMIN' };
    outsider = { userId: outsiderUser.id, userRole: outsiderUser.role };

    const space = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Blocks Space', slug: `blocks-space-${timestamp}`, visibility: SpaceVisibility.RESTRICTED })
      .expect(201);
    spaceId = (space.body as IdResponse).id;
    workspaceId = (await prisma.space.findUniqueOrThrow({ where: { id: spaceId } })).workspaceId;

    rootPageId = await createPage(
      'Proyecto',
      pageWithoutIds(
        { attrs: { level: 1 }, content: [text('Riesgos')], type: 'heading' },
        { content: [text(`El proveedor ${term} se atrasa`)], type: 'paragraph' },
      ),
    );
    childPageId = await createPage(
      'Subproyecto',
      pageWithoutIds({ content: [text(`Plan del ${term} hijo`)], type: 'paragraph' }),
      rootPageId,
    );
    otherPageId = await createPage(
      'Otra',
      pageWithoutIds({ content: [text(`Mención suelta de ${term}`)], type: 'paragraph' }),
    );
    await drainSearchProjection(testApp);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('gives every block written without an id its own id when the page is created', async () => {
    const stored = await readStoredContent(rootPageId);

    expect(stored.content.every((block) => typeof block.attrs?.id === 'string')).toBe(true);
  });

  it('finds the block itself, with its page and the heading it sits under', async () => {
    const stored = await readStoredContent(rootPageId);
    const paragraphId = stored.content[1]?.attrs?.id;

    const found = await searchBlocks(admin, term);
    const hit = found.items.find((item) => item.pageId === rootPageId);

    expect(hit).toMatchObject({
      blockId: paragraphId,
      blockType: 'paragraph',
      headingPath: ['Riesgos'],
      pageTitle: 'Proyecto',
      spaceName: 'Blocks Space',
    });
    expect(hit?.snippet).toContain('<mark>');
  });

  it('forgives a typo in what is searched for', async () => {
    const found = await searchBlocks(admin, term.replace('Quill', 'Quil'));

    expect(found.items.some((item) => item.pageId === rootPageId)).toBe(true);
  });

  /** Un pedazo de palabra en común no es un error de tipeo: «vendor» no es «Venn». */
  it('does not take a word that merely shares a few letters for a typo', async () => {
    const lookalikePageId = await createPage(
      'Parecida',
      pageWithoutIds({ content: [text(`Venn ${term}`)], type: 'paragraph' }),
    );
    await drainSearchProjection(testApp);

    const found = await searchBlocks(admin, 'vendor');

    expect(found.items.some((item) => item.pageId === lookalikePageId)).toBe(false);
  });

  it('hides the blocks of a space the reader cannot see', async () => {
    const found = await searchBlocks(outsider, term);

    expect(found.items).toEqual([]);
  });

  it('searches only under a page when asked, the page and everything that hangs from it', async () => {
    const found = await searchBlocks(admin, term, { rootPageId });

    expect(new Set(found.items.map((item) => item.pageId))).toEqual(new Set([rootPageId, childPageId]));
  });

  it('keeps a page a token closes out of the results, and lets in only what a page rule opens', async () => {
    const closed = await searchBlocks(admin, term, { tokenScope: { ...closedNowhere, closedPageIds: [otherPageId] } });
    const onlyOpened = await searchBlocks(admin, term, {
      tokenScope: { ...closedNowhere, allowedPageIds: [childPageId], readsEverywhere: false },
    });

    expect(closed.items.some((item) => item.pageId === otherPageId)).toBe(false);
    expect(onlyOpened.items.map((item) => item.pageId)).toEqual([childPageId]);
  });

  it('does not let an older version of a page overwrite the blocks of a newer one', async () => {
    const before = await testApp.get(PrismaService).pageBlock.findMany({ where: { pageId: otherPageId } });

    await testApp.get(PageBlockRepository).replaceBlocks({ blocks: [], pageId: otherPageId, pageVersion: 0, spaceId });

    const after = await testApp.get(PrismaService).pageBlock.findMany({ where: { pageId: otherPageId } });
    expect(after).toEqual(before);
  });

  describe('filling in the pages that were there before', () => {
    let outsiderToken: string;
    let oldPageId: string;
    let unprojectedPageId: string;
    const oldWord = `Vornaquel${String(Date.now())}`;
    const unprojectedWord = `Drismeloth${String(Date.now())}`;

    const fill = (token: string) =>
      request(testApp.getServer()).post('/api/v1/maintenance/pages/blocks').set('Authorization', `Bearer ${token}`);

    const countVersions = (pageId: string) => testApp.get(PrismaService).pageVersion.count({ where: { pageId } });

    beforeAll(async () => {
      const prisma = testApp.get(PrismaService);
      const outsiderEmail = (await prisma.user.findUniqueOrThrow({ where: { id: outsider.userId } })).email;
      outsiderToken = (await loginUser(testApp, outsiderEmail, 'plainPassword123')).accessToken;

      oldPageId = await createPage('Antigua', pageWithoutIds({ content: [text(oldWord)], type: 'paragraph' }));
      unprojectedPageId = await createPage(
        'Sin proyectar',
        pageWithoutIds({ content: [text(unprojectedWord)], type: 'paragraph' }),
      );
      await drainSearchProjection(testApp);
      await prisma.page.update({
        data: {
          content: { content: [{ content: [text(oldWord)], type: 'paragraph' }], schemaVersion: 1, type: 'doc' },
        },
        where: { id: oldPageId },
      });
      await prisma.pageBlock.deleteMany({ where: { pageId: { in: [oldPageId, unprojectedPageId] } } });
    });

    it('is refused to anyone who does not run the workspace', async () => {
      await fill(outsiderToken).expect(403);
    });

    it('gives the blocks of an old page their ids, and makes them findable again', async () => {
      const response = await fill(adminToken).expect(200);
      await drainSearchProjection(testApp);

      const stored = await readStoredContent(oldPageId);
      expect((response.body as { pagesGivenIds: number }).pagesGivenIds).toBeGreaterThanOrEqual(1);
      expect(stored.content.every((block) => typeof block.attrs?.id === 'string')).toBe(true);
      expect((await searchBlocks(admin, oldWord)).items.map((item) => item.pageId)).toEqual([oldPageId]);
    });

    it('projects a page that already had its ids but was never projected', async () => {
      expect((await searchBlocks(admin, unprojectedWord)).items.map((item) => item.pageId)).toEqual([
        unprojectedPageId,
      ]);
    });

    it('changes nothing the second time', async () => {
      const versionsBefore = await countVersions(oldPageId);

      const response = await fill(adminToken).expect(200);

      expect((response.body as { pagesGivenIds: number }).pagesGivenIds).toBe(0);
      expect(await countVersions(oldPageId)).toBe(versionsBefore);
    });
  });

  it('forgets the blocks of a page thrown in the trash', async () => {
    await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages/${otherPageId}/trash`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-mutation-id', crypto.randomUUID())
      .expect(201);
    await drainSearchProjection(testApp);

    const found = await searchBlocks(admin, term);

    expect(found.items.some((item) => item.pageId === otherPageId)).toBe(false);
  });
});
