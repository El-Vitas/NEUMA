import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import type { PageContent, UserRole } from '@neuma/shared';
import request from 'supertest';
import type { SearchTokenScope } from '@/common/types/search.types';
import { PageBlockRepository } from '@/modules/search/infrastructure/persistence/page-block.repository';
import { SearchService } from '@/modules/search/search.service';
import type { PageBlockSearchQuery } from '@/modules/search/types/page-block.types';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { drainSearchProjection } from '../helpers/search.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface IdResponse {
  id: string;
}

interface Reader {
  readonly userId: string;
  readonly userRole: UserRole;
}

// The pass walks every page in the run's one shared workspace, so it takes longer the later this file runs.
const WORKSPACE_PASS_TIMEOUT_MS = 120_000;

const text = (value: string) => ({ text: value, type: 'text' as const });

const pageWithoutIds = (...blocks: readonly unknown[]): unknown => ({ content: blocks, schemaVersion: 1, type: 'doc' });

const required = <Row>(row: Row | null, description: string): Row => {
  if (row === null) throw new Error(`Expected ${description} to exist`);
  return row;
};

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
    const page = required(await testApp.get(PrismaService).models.Page.where({ id: pageId }).first(), 'the page');
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

    await createAccount(testApp, { email: adminEmail, name: 'Blocks Admin', password });
    await createAccount(testApp, { email: outsiderEmail, name: 'Blocks Outsider', password });
    await prisma.models.User.where({ email: adminEmail }).update({ role: 'ADMIN' });
    adminToken = (await loginUser(testApp, adminEmail, password)).accessToken;
    const adminUser = required(await prisma.models.User.where({ email: adminEmail }).first(), 'the admin user');
    const outsiderUser = required(
      await prisma.models.User.where({ email: outsiderEmail }).first(),
      'the outsider user',
    );
    admin = { userId: adminUser.id, userRole: 'ADMIN' };
    outsider = { userId: outsiderUser.id, userRole: outsiderUser.role };

    const space = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Blocks Space', slug: `blocks-space-${timestamp}`, visibility: SpaceVisibility.RESTRICTED })
      .expect(201);
    spaceId = (space.body as IdResponse).id;
    workspaceId = required(await prisma.models.Space.where({ id: spaceId }).first(), 'the space').workspaceId;

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

  it('does not take a word that merely shares a few letters for a typo', async () => {
    const lookalikePageId = await createPage(
      'Parecida',
      pageWithoutIds({ content: [text(`Venn ${term}`)], type: 'paragraph' }),
    );
    await drainSearchProjection(testApp);

    const found = await searchBlocks(admin, 'vendor');

    expect(found.items.some((item) => item.pageId === lookalikePageId)).toBe(false);
  });

  it('finds what is searched for inside a longer word, after the blocks that have it as a whole word', async () => {
    const wanted = `safe${String(Date.now())}`;
    const insidePageId = await createPage(
      'ÜSAFE',
      pageWithoutIds({ content: [text(`Arquitectura de Ü${wanted}`)], type: 'paragraph' }),
    );
    const wholePageId = await createPage(
      'Entera',
      pageWithoutIds({ content: [text(`Modo ${wanted}`)], type: 'paragraph' }),
    );
    await drainSearchProjection(testApp);

    const found = await searchBlocks(admin, wanted);

    expect(found.items.map((item) => item.pageId)).toEqual([wholePageId, insidePageId]);
  });

  it('keeps only the blocks of verified pages when asked, and says which pages are verified', async () => {
    const prisma = testApp.get(PrismaService);
    await prisma.models.Page.where({ id: childPageId }).update({ verifiedAt: new Date(), verifiedById: admin.userId });
    await prisma.models.Page.where({ id: otherPageId }).update({
      verificationExpiresAt: new Date('2020-01-01T00:00:00.000Z'),
      verifiedAt: new Date('2019-01-01T00:00:00.000Z'),
    });

    const [all, verifiedOnly] = await Promise.all([
      searchBlocks(admin, term),
      searchBlocks(admin, term, { verifiedOnly: true }),
    ]);

    expect(verifiedOnly.items.map((item) => item.pageId)).toEqual([childPageId]);
    expect(all.items.find((item) => item.pageId === childPageId)?.isPageVerified).toBe(true);
    expect(all.items.find((item) => item.pageId === otherPageId)?.isPageVerified).toBe(false);
  });

  it('filters by who created the page and by when it was last edited', async () => {
    const [byAuthor, byNobody, editedToday] = await Promise.all([
      searchBlocks(admin, term, { authorQuery: 'blocks adm' }),
      searchBlocks(admin, term, { authorQuery: 'Nadie Conocido' }),
      searchBlocks(admin, term, { editedRange: 'TODAY' }),
    ]);

    expect(byAuthor.items.some((item) => item.pageId === rootPageId)).toBe(true);
    expect(byNobody.items).toEqual([]);
    expect(editedToday.items.some((item) => item.pageId === rootPageId)).toBe(true);
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
    const before = await testApp.get(PrismaService).models.PageBlock.where({ pageId: otherPageId }).all();

    await testApp.get(PageBlockRepository).replaceBlocks({ blocks: [], pageId: otherPageId, pageVersion: 0, spaceId });

    const after = await testApp.get(PrismaService).models.PageBlock.where({ pageId: otherPageId }).all();
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

    const countVersions = async (pageId: string): Promise<number> =>
      (
        await testApp
          .get(PrismaService)
          .models.PageVersion.where({ pageId })
          .aggregate((aggregation) => ({ total: aggregation.count() }))
      ).total;

    beforeAll(async () => {
      const prisma = testApp.get(PrismaService);
      const outsiderEmail = required(
        await prisma.models.User.where({ id: outsider.userId }).first(),
        'the outsider user',
      ).email;
      outsiderToken = (await loginUser(testApp, outsiderEmail, 'plainPassword123')).accessToken;

      oldPageId = await createPage('Antigua', pageWithoutIds({ content: [text(oldWord)], type: 'paragraph' }));
      unprojectedPageId = await createPage(
        'Sin proyectar',
        pageWithoutIds({ content: [text(unprojectedWord)], type: 'paragraph' }),
      );
      await drainSearchProjection(testApp);
      await prisma.models.Page.where({ id: oldPageId }).update({
        content: { content: [{ content: [text(oldWord)], type: 'paragraph' }], schemaVersion: 1, type: 'doc' },
      });
      await prisma.models.PageBlock.where((block) => block.pageId.in([oldPageId, unprojectedPageId])).deleteAndCount();
    });

    it('is refused to anyone who does not run the workspace', async () => {
      await fill(outsiderToken).expect(403);
    });

    it(
      'gives the blocks of an old page their ids, and makes them findable again',
      async () => {
        const response = await fill(adminToken).expect(200);
        await drainSearchProjection(testApp);

        const stored = await readStoredContent(oldPageId);
        expect((response.body as { pagesGivenIds: number }).pagesGivenIds).toBeGreaterThanOrEqual(1);
        expect(stored.content.every((block) => typeof block.attrs?.id === 'string')).toBe(true);
        expect((await searchBlocks(admin, oldWord)).items.map((item) => item.pageId)).toEqual([oldPageId]);
      },
      WORKSPACE_PASS_TIMEOUT_MS,
    );

    it('projects a page that already had its ids but was never projected', async () => {
      expect((await searchBlocks(admin, unprojectedWord)).items.map((item) => item.pageId)).toEqual([
        unprojectedPageId,
      ]);
    });

    it(
      'changes nothing the second time',
      async () => {
        const versionsBefore = await countVersions(oldPageId);

        const response = await fill(adminToken).expect(200);

        expect((response.body as { pagesGivenIds: number }).pagesGivenIds).toBe(0);
        expect(await countVersions(oldPageId)).toBe(versionsBefore);
      },
      WORKSPACE_PASS_TIMEOUT_MS,
    );
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
