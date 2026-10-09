import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { PageLifecycle, SpaceVisibility } from '@neuma/db';
import { ACCESS_TOKEN_PERMISSIONS, type AccessTokenAccess, type PageContent } from '@neuma/shared';
import request from 'supertest';
import { z } from 'zod';
import { PrismaService } from '@/prisma/prisma.service';
import { loginUser, registerUser } from '../helpers/auth.helper';
import { callMcpTool, listenForMcp, listMcpToolNames, type McpToolAnswer } from '../helpers/mcp.helper';
import { drainSearchProjection } from '../helpers/search.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

const MCP_PATH = '/api/v1/mcp';
const TOKENS_PATH = '/api/v1/access-tokens';
const PASSWORD = 'plainPassword123';

interface Session {
  readonly id: string;
  readonly token: string;
}

const read = ACCESS_TOKEN_PERMISSIONS.pagesRead;
const nothing: AccessTokenAccess['allSpaces'] = [];

const listedSpacesShape = z.object({ spaces: z.array(z.object({ id: z.string() })) });
const foundShape = z.object({
  blocks: z.array(z.object({ pageId: z.string() })),
  pages: z.array(z.object({ pageId: z.string() })),
});
const refusalShape = z.object({ error: z.object({ code: z.string() }) });

const access = (rules: Partial<AccessTokenAccess>): AccessTokenAccess => ({
  allSpaces: [],
  pages: [],
  spaces: [],
  ...rules,
});

/** Read, search and list must agree: whichever says more is where access leaks. */
describe('MCP access (Integration)', () => {
  let testApp: TestApp;
  let baseUrl: string;
  let admin: Session;
  let worker: Session;
  let reader: Session;
  let tokenCount = 0;
  const spaces = { open: '', restricted: '', workerPrivate: '' };
  const pages = {
    bonus: '',
    deep: '',
    holidays: '',
    hr: '',
    open: '',
    restricted: '',
    salaries: '',
    summer: '',
    workerPrivate: '',
  };

  // Words with nothing in common: search also matches by similarity, so words sharing a suffix would find each other.
  const words = {
    bonus: 'Tavrenholm',
    deep: 'Oxquindrel',
    holidays: 'Brelmaquist',
    hr: 'Sclovantide',
    open: 'Zorbanique',
    restricted: 'Quelvarth',
    salaries: 'Yudrecomb',
    summer: 'Plinzavort',
    workerPrivate: 'Mipsotrel',
  };

  const signUp = async (label: string, role: 'ADMIN' | 'CLIENT' | 'WORKER'): Promise<Session> => {
    const email = `mcp-access-${label}-${String(Date.now())}@test.com`;
    await registerUser(testApp, { email, name: `MCP ${label}`, password: PASSWORD });
    await testApp.get(PrismaService).user.update({ data: { role }, where: { email } });
    const session = await loginUser(testApp, email, PASSWORD);
    return { id: session.user.id, token: session.accessToken };
  };

  const createSpace = async (owner: Session, name: string, visibility: SpaceVisibility): Promise<string> => {
    const response = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name, slug: `${name.toLowerCase()}-${String(Date.now())}`, visibility })
      .expect(201);
    return (response.body as { id: string }).id;
  };

  const privateSpaceOf = async (owner: Session): Promise<string> => {
    const response = await request(testApp.getServer())
      .get('/api/v1/spaces')
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);
    const listed = response.body as { id: string; visibility: string }[];
    const privateSpace = listed.find((space) => space.visibility === SpaceVisibility.PRIVATE);
    if (privateSpace === undefined) throw new Error('The owner has no private space after listing spaces');
    return privateSpace.id;
  };

  const createPage = async (owner: Session, spaceId: string, word: string, parentId?: string): Promise<string> => {
    const content: PageContent = {
      content: [{ content: [{ text: word, type: 'text' }], type: 'paragraph' }],
      schemaVersion: 1,
      type: 'doc',
    };
    const response = await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send(parentId === undefined ? { content, title: word } : { content, parentId, title: word })
      .expect(201);
    return (response.body as { id: string }).id;
  };

  const askForToken = (owner: Session, rules: AccessTokenAccess, overrides: Record<string, unknown> = {}) => {
    tokenCount += 1;
    return request(testApp.getServer())
      .post(TOKENS_PATH)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ access: rules, name: `Agente de prueba ${String(tokenCount)}`, ...overrides });
  };

  const tokenFor = async (owner: Session, rules: AccessTokenAccess): Promise<string> =>
    ((await askForToken(owner, rules).expect(201)).body as { secret: string }).secret;

  const refusalCode = (body: unknown): string => refusalShape.parse(body).error.code;

  const call = (secret: string, name: string, args: Record<string, unknown>): Promise<McpToolAnswer> =>
    callMcpTool(baseUrl, secret, name, args);

  const listedSpaceIds = async (secret: string): Promise<readonly string[]> => {
    const result = await call(secret, 'list_spaces', {});
    return listedSpacesShape.parse(result.structuredContent).spaces.map((space) => space.id);
  };

  const foundPageIds = async (secret: string, query: string, spaceId?: string): Promise<readonly string[]> => {
    const result = await call(secret, 'search', spaceId === undefined ? { query } : { query, spaceId });
    const found = foundShape.parse(result.structuredContent);
    return [...new Set([...found.blocks, ...found.pages].map((item) => item.pageId))];
  };

  const canRead = async (secret: string, pageId: string): Promise<boolean> =>
    (await call(secret, 'fetch', { address: pageId })).isError !== true;

  const reaches = async (secret: string, page: keyof typeof pages): Promise<boolean> => {
    const isReadable = await canRead(secret, pages[page]);
    const isFound = (await foundPageIds(secret, words[page])).includes(pages[page]);
    expect(isFound).toBe(isReadable);
    return isReadable;
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    baseUrl = await listenForMcp(testApp);

    admin = await signUp('admin', 'ADMIN');
    worker = await signUp('worker', 'WORKER');
    reader = await signUp('reader', 'CLIENT');

    spaces.open = await createSpace(admin, 'Abierto', SpaceVisibility.PUBLIC_INTERNAL);
    spaces.restricted = await createSpace(admin, 'Restringido', SpaceVisibility.RESTRICTED);
    spaces.workerPrivate = await privateSpaceOf(worker);
    await testApp.get(PrismaService).spaceMember.create({ data: { spaceId: spaces.restricted, userId: worker.id } });

    pages.open = await createPage(admin, spaces.open, words.open);
    pages.hr = await createPage(admin, spaces.open, words.hr);
    pages.salaries = await createPage(admin, spaces.open, words.salaries, pages.hr);
    pages.bonus = await createPage(admin, spaces.open, words.bonus, pages.salaries);
    pages.deep = await createPage(admin, spaces.open, words.deep, pages.bonus);
    pages.holidays = await createPage(admin, spaces.open, words.holidays, pages.hr);
    pages.summer = await createPage(admin, spaces.open, words.summer, pages.holidays);
    pages.restricted = await createPage(admin, spaces.restricted, words.restricted);
    pages.workerPrivate = await createPage(worker, spaces.workerPrivate, words.workerPrivate);
    await drainSearchProjection(testApp);
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('un token limitado a un espacio', () => {
    let secret: string;

    beforeAll(async () => {
      secret = await tokenFor(worker, access({ spaces: [{ permissions: [read], spaceId: spaces.open }] }));
    });

    it('lists only that space, although its owner sees more', async () => {
      expect(await listedSpaceIds(secret)).toEqual([spaces.open]);
    });

    it('finds what is in that space and nothing that is outside it', async () => {
      expect(await foundPageIds(secret, words.open)).toContain(pages.open);
      expect(await foundPageIds(secret, words.restricted)).toEqual([]);
    });

    it('cannot widen the search by naming a space it was not given', async () => {
      expect(await foundPageIds(secret, words.restricted, spaces.restricted)).toEqual([]);
    });

    it('cannot read a page outside that space by its id, and is not told the page exists', async () => {
      const refused = await call(secret, 'fetch', { address: pages.restricted });
      const missing = await call(secret, 'fetch', { address: '00000000-0000-4000-8000-000000000000' });

      expect(refused.isError).toBe(true);
      expect(refused.content).toEqual(missing.content);
    });

    it('reads a page inside that space, at any depth', async () => {
      expect(await reaches(secret, 'open')).toBe(true);
      expect(await reaches(secret, 'deep')).toBe(true);
    });
  });

  describe('un token de lectura en todos los espacios', () => {
    it('sees everything its owner sees, own private space included', async () => {
      const secret = await tokenFor(worker, access({ allSpaces: [read] }));

      const listed = await listedSpaceIds(secret);

      expect(listed).toContain(spaces.open);
      expect(listed).toContain(spaces.restricted);
      expect(listed).toContain(spaces.workerPrivate);
    });

    it('of an admin never reaches someone else’s private space', async () => {
      const secret = await tokenFor(admin, access({ allSpaces: [read] }));

      expect(await listedSpaceIds(secret)).not.toContain(spaces.workerPrivate);
      expect(await foundPageIds(secret, words.workerPrivate)).toEqual([]);
      expect(await canRead(secret, pages.workerPrivate)).toBe(false);
    });
  });

  describe('todo menos un espacio', () => {
    it('does not list, find or read anything in the excluded space', async () => {
      const secret = await tokenFor(
        worker,
        access({ allSpaces: [read], spaces: [{ permissions: nothing, spaceId: spaces.restricted }] }),
      );

      expect(await listedSpaceIds(secret)).not.toContain(spaces.restricted);
      expect(await foundPageIds(secret, words.restricted)).toEqual([]);
      expect(await canRead(secret, pages.restricted)).toBe(false);
      expect(await reaches(secret, 'open')).toBe(true);
    });
  });

  describe('todo menos una página', () => {
    let secret: string;

    beforeAll(async () => {
      secret = await tokenFor(
        worker,
        access({ allSpaces: [read], pages: [{ pageId: pages.hr, permissions: nothing }] }),
      );
    });

    it('closes the page and everything under it, at any depth, by every path', async () => {
      expect(await reaches(secret, 'hr')).toBe(false);
      expect(await reaches(secret, 'salaries')).toBe(false);
      expect(await reaches(secret, 'bonus')).toBe(false);
      expect(await reaches(secret, 'deep')).toBe(false);
      expect(await reaches(secret, 'holidays')).toBe(false);
    });

    it('keeps everything else, the same space included', async () => {
      expect(await reaches(secret, 'open')).toBe(true);
      expect(await listedSpaceIds(secret)).toContain(spaces.open);
    });
  });

  describe('excluir y reabrir adentro', () => {
    it('reopens a branch inside a closed one, and only that branch', async () => {
      const secret = await tokenFor(
        worker,
        access({
          allSpaces: [read],
          pages: [
            { pageId: pages.hr, permissions: nothing },
            { pageId: pages.holidays, permissions: [read] },
          ],
        }),
      );

      expect(await reaches(secret, 'holidays')).toBe(true);
      expect(await reaches(secret, 'summer')).toBe(true);
      expect(await reaches(secret, 'hr')).toBe(false);
      expect(await reaches(secret, 'salaries')).toBe(false);
    });
  });

  describe('bloques, enlaces y el árbol de una página cerrada', () => {
    let secret: string;
    let salariesBlockId: string;
    let mentioningPageId: string;

    const firstBlockIdOf = async (pageId: string): Promise<string> => {
      const page = await testApp.get(PrismaService).page.findUniqueOrThrow({ where: { id: pageId } });
      const blockId = (page.content as PageContent).content[0]?.attrs?.id;
      if (typeof blockId !== 'string') throw new Error('the page was stored without block ids');
      return blockId;
    };

    const listedUnder = async (parentPageId: string) =>
      z
        .object({ pages: z.array(z.object({ childCount: z.number(), id: z.string() })) })
        .parse((await call(secret, 'list_pages', { parentPageId })).structuredContent).pages;

    beforeAll(async () => {
      secret = await tokenFor(
        worker,
        access({ allSpaces: [read], pages: [{ pageId: pages.salaries, permissions: nothing }] }),
      );
      salariesBlockId = await firstBlockIdOf(pages.salaries);
      const content = {
        content: [
          {
            content: [
              { text: 'Ver ', type: 'text' },
              { attrs: { label: words.salaries, pageId: pages.salaries, spaceId: spaces.open }, type: 'mention' },
            ],
            type: 'paragraph',
          },
        ],
        schemaVersion: 1,
        type: 'doc',
      };
      const response = await request(testApp.getServer())
        .post(`/api/v1/spaces/${spaces.open}/pages`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ content, title: 'Menciona' })
        .expect(201);
      mentioningPageId = (response.body as { id: string }).id;
    });

    it('cannot open a block of a closed page by its id or its link, and is not told it exists', async () => {
      const missing = await call(secret, 'fetch', { address: '00000000-0000-4000-8000-000000000000' });
      const byId = await call(secret, 'fetch', { address: salariesBlockId });
      const byLink = await call(secret, 'fetch', {
        address: `https://brain.example.com/es/spaces/${spaces.open}/pages/${pages.salaries}#${salariesBlockId}`,
      });

      expect(byId.isError).toBe(true);
      expect(byId.content).toEqual(missing.content);
      expect(byLink.content).toEqual(missing.content);
    });

    it('opens a block of a page it can read, by its id alone', async () => {
      const result = await call(secret, 'fetch', { address: await firstBlockIdOf(pages.open) });

      expect(result.isError).not.toBe(true);
      expect(JSON.stringify(result.content)).toContain(words.open);
    });

    it('does not name a closed page mentioned from a page it can read', async () => {
      const result = await call(secret, 'fetch', { address: mentioningPageId });

      expect(result.isError).not.toBe(true);
      expect(JSON.stringify(result)).not.toContain(words.salaries);
      expect(JSON.stringify(result)).not.toContain(pages.salaries);
    });

    it('neither lists nor counts a closed page under one it can read', async () => {
      const underHr = await listedUnder(pages.hr);
      const atTheTop = z
        .object({ pages: z.array(z.object({ childCount: z.number(), id: z.string() })) })
        .parse((await call(secret, 'list_pages', { spaceId: spaces.open })).structuredContent).pages;

      expect(underHr.map((page) => page.id)).toEqual([pages.holidays]);
      expect(atTheTop.find((page) => page.id === pages.hr)?.childCount).toBe(1);
    });

    it('does not name a closed ancestor in the path of a page reopened under it', async () => {
      const reopened = await tokenFor(
        worker,
        access({
          allSpaces: [read],
          pages: [
            { pageId: pages.hr, permissions: nothing },
            { pageId: pages.holidays, permissions: [read] },
          ],
        }),
      );

      const result = await call(reopened, 'fetch', { address: pages.summer });

      expect(result.isError).not.toBe(true);
      expect(JSON.stringify(result.structuredContent)).toContain(words.holidays);
      expect(JSON.stringify(result.structuredContent)).not.toContain(words.hr);
      expect(JSON.stringify(result.structuredContent)).not.toContain(pages.hr);
    });
  });

  describe('solo una página', () => {
    let secret: string;

    beforeAll(async () => {
      secret = await tokenFor(worker, access({ pages: [{ pageId: pages.holidays, permissions: [read] }] }));
    });

    it('reaches the page and what hangs from it, and nothing else of its space', async () => {
      expect(await reaches(secret, 'holidays')).toBe(true);
      expect(await reaches(secret, 'summer')).toBe(true);
      expect(await reaches(secret, 'hr')).toBe(false);
      expect(await reaches(secret, 'open')).toBe(false);
      expect(await reaches(secret, 'salaries')).toBe(false);
    });

    it('lists the space of that page and no other', async () => {
      expect(await listedSpaceIds(secret)).toEqual([spaces.open]);
    });

    it('cannot widen the search by naming another space', async () => {
      expect(await foundPageIds(secret, words.restricted, spaces.restricted)).toEqual([]);
    });
  });

  describe('el árbol de hoy manda, no el del día en que se dio', () => {
    it('loses a page moved out from under the page it was given', async () => {
      const prisma = testApp.get(PrismaService);
      const secret = await tokenFor(worker, access({ pages: [{ pageId: pages.holidays, permissions: [read] }] }));

      expect(await canRead(secret, pages.summer)).toBe(true);
      await prisma.page.update({ data: { parentId: null }, where: { id: pages.summer } });
      const afterMove = await canRead(secret, pages.summer);
      await prisma.page.update({ data: { parentId: pages.holidays }, where: { id: pages.summer } });

      expect(afterMove).toBe(false);
    });

    it('closes a page moved in under a closed one', async () => {
      const prisma = testApp.get(PrismaService);
      const secret = await tokenFor(
        worker,
        access({ allSpaces: [read], pages: [{ pageId: pages.hr, permissions: nothing }] }),
      );

      expect(await reaches(secret, 'open')).toBe(true);
      await prisma.page.update({ data: { parentId: pages.hr }, where: { id: pages.open } });
      const afterMove = await reaches(secret, 'open');
      await prisma.page.update({ data: { parentId: null }, where: { id: pages.open } });

      expect(afterMove).toBe(false);
    });

    it('loses a space the moment its owner loses it', async () => {
      const secret = await tokenFor(worker, access({ spaces: [{ permissions: [read], spaceId: spaces.restricted }] }));
      const prisma = testApp.get(PrismaService);

      expect(await canRead(secret, pages.restricted)).toBe(true);
      await prisma.spaceMember.deleteMany({ where: { spaceId: spaces.restricted, userId: worker.id } });
      const afterRemoval = await canRead(secret, pages.restricted);
      await prisma.spaceMember.create({ data: { spaceId: spaces.restricted, userId: worker.id } });

      expect(afterRemoval).toBe(false);
    });
  });

  describe('lo que un dueño no puede dar', () => {
    it('refuses a token naming a private space its creator does not own, even for an admin', async () => {
      const refused = await askForToken(
        admin,
        access({ spaces: [{ permissions: [read], spaceId: spaces.workerPrivate }] }),
      ).expect(403);

      expect(refusalCode(refused.body)).toBe('ACCESS_TOKEN_SPACE_NOT_ACCESSIBLE');
    });

    it('refuses to exclude a space its creator cannot see', async () => {
      const refused = await askForToken(
        admin,
        access({ allSpaces: [read], spaces: [{ permissions: nothing, spaceId: spaces.workerPrivate }] }),
      ).expect(403);

      expect(refusalCode(refused.body)).toBe('ACCESS_TOKEN_SPACE_NOT_ACCESSIBLE');
    });

    it('refuses a token naming a restricted space its creator is not a member of', async () => {
      await askForToken(reader, access({ spaces: [{ permissions: [read], spaceId: spaces.restricted }] })).expect(403);
    });

    it('refuses a page its creator cannot see, a page that does not exist, and one in the trash', async () => {
      const prisma = testApp.get(PrismaService);
      const invisible = await askForToken(
        admin,
        access({ pages: [{ pageId: pages.workerPrivate, permissions: [read] }] }),
      ).expect(403);
      const missing = await askForToken(
        worker,
        access({ pages: [{ pageId: '00000000-0000-4000-8000-000000000000', permissions: [read] }] }),
      ).expect(403);
      await prisma.page.update({ data: { lifecycle: PageLifecycle.TRASHED }, where: { id: pages.bonus } });
      const trashed = await askForToken(worker, access({ pages: [{ pageId: pages.bonus, permissions: [read] }] }));
      await prisma.page.update({ data: { lifecycle: PageLifecycle.ACTIVE }, where: { id: pages.bonus } });

      expect(refusalCode(invisible.body)).toBe('ACCESS_TOKEN_PAGE_NOT_ACCESSIBLE');
      expect(refusalCode(missing.body)).toBe('ACCESS_TOKEN_PAGE_NOT_ACCESSIBLE');
      expect(trashed.status).toBe(403);
    });

    it('refuses writing permissions to someone who can only read, wherever they are given', async () => {
      const everywhere = await askForToken(reader, access({ allSpaces: [ACCESS_TOKEN_PERMISSIONS.pagesWrite] })).expect(
        403,
      );
      const onePage = await askForToken(
        reader,
        access({ pages: [{ pageId: pages.open, permissions: [ACCESS_TOKEN_PERMISSIONS.pagesWrite] }] }),
      ).expect(403);

      expect(refusalCode(everywhere.body)).toBe('ACCESS_TOKEN_PERMISSION_BEYOND_OWNER');
      expect(refusalCode(onePage.body)).toBe('ACCESS_TOKEN_PERMISSION_BEYOND_OWNER');
    });

    it('refuses a permission the catalogue does not know, and a token that gives nothing', async () => {
      await askForToken(worker, access({ allSpaces: [] })).expect(400);
      await request(testApp.getServer())
        .post(TOKENS_PATH)
        .set('Authorization', `Bearer ${worker.token}`)
        .send({ access: { allSpaces: ['pages:everything'], pages: [], spaces: [] }, name: 'Inventado' })
        .expect(400);
    });
  });

  describe('el nombre y el vencimiento', () => {
    it('refuses a second live token that reads the same, and allows it once the first is revoked', async () => {
      const first = (
        await askForToken(worker, access({ allSpaces: [read] }), { name: 'Claude del equipo' }).expect(201)
      ).body as { token: { id: string } };

      const twin = await askForToken(worker, access({ allSpaces: [read] }), { name: '  claude   DEL equipo ' }).expect(
        409,
      );
      await request(testApp.getServer())
        .delete(`${TOKENS_PATH}/${first.token.id}`)
        .set('Authorization', `Bearer ${worker.token}`)
        .expect(200);
      await askForToken(worker, access({ allSpaces: [read] }), { name: 'Claude del equipo' }).expect(201);

      expect(refusalCode(twin.body)).toBe('ACCESS_TOKEN_NAME_TAKEN');
    });

    it('refuses a name with a line break, and one that is only spaces', async () => {
      await askForToken(worker, access({ allSpaces: [read] }), { name: 'Claude\nadmin' }).expect(400);
      await askForToken(worker, access({ allSpaces: [read] }), { name: '    ' }).expect(400);
    });

    it('accepts any future expiry and refuses one that already passed', async () => {
      await askForToken(worker, access({ allSpaces: [read] }), { expiresAt: '2099-12-31T03:00:00.000Z' }).expect(201);
      const past = await askForToken(worker, access({ allSpaces: [read] }), {
        expiresAt: '2020-01-01T00:00:00.000Z',
      }).expect(400);

      expect(refusalCode(past.body)).toBe('ACCESS_TOKEN_EXPIRY_IN_PAST');
    });
  });

  describe('lo que cambia después de darlo', () => {
    it('stops working the moment it is revoked', async () => {
      const created = (await askForToken(worker, access({ allSpaces: [read] })).expect(201)).body as {
        secret: string;
        token: { id: string };
      };

      await request(testApp.getServer())
        .delete(`${TOKENS_PATH}/${created.token.id}`)
        .set('Authorization', `Bearer ${worker.token}`)
        .expect(200);

      await request(testApp.getServer())
        .post(MCP_PATH)
        .set('Authorization', `Bearer ${created.secret}`)
        .send({})
        .expect(401);
    });

    it('cannot be changed by anyone but its owner', async () => {
      const created = (await askForToken(worker, access({ allSpaces: [read] })).expect(201)).body as {
        token: { id: string };
      };

      await request(testApp.getServer())
        .patch(`${TOKENS_PATH}/${created.token.id}/access`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ access: access({ allSpaces: [read, ACCESS_TOKEN_PERMISSIONS.pagesWrite] }) })
        .expect(404);
    });

    it('changes to what its owner asks for, with the same checks as creating it', async () => {
      const created = (await askForToken(worker, access({ allSpaces: [read] })).expect(201)).body as {
        secret: string;
        token: { id: string };
      };

      await request(testApp.getServer())
        .patch(`${TOKENS_PATH}/${created.token.id}/access`)
        .set('Authorization', `Bearer ${worker.token}`)
        .send({ access: access({ pages: [{ pageId: pages.workerPrivate, permissions: [read] }] }) })
        .expect(200);
      const refused = await request(testApp.getServer())
        .patch(`${TOKENS_PATH}/${created.token.id}/access`)
        .set('Authorization', `Bearer ${worker.token}`)
        .send({ access: access({ pages: [{ pageId: '00000000-0000-4000-8000-000000000000', permissions: [read] }] }) })
        .expect(403);

      expect(await canRead(created.secret, pages.workerPrivate)).toBe(true);
      expect(await canRead(created.secret, pages.open)).toBe(false);
      expect(refusalCode(refused.body)).toBe('ACCESS_TOKEN_PAGE_NOT_ACCESSIBLE');
    });
  });

  describe('qué herramientas se le ofrecen al agente', () => {
    it('offers only the tools the token can use somewhere', async () => {
      const secret = await tokenFor(
        worker,
        access({ spaces: [{ permissions: [ACCESS_TOKEN_PERMISSIONS.collectionsRead], spaceId: spaces.open }] }),
      );
      expect(await listMcpToolNames(baseUrl, secret)).toEqual(['list_spaces', 'get_collection', 'query_collection']);
    });
  });

  describe('lo que ve quien administra', () => {
    it('sees every token and counts, without naming, the places it cannot see', async () => {
      const created = (
        await askForToken(
          worker,
          access({
            pages: [{ pageId: pages.workerPrivate, permissions: [read] }],
            spaces: [
              { permissions: [read], spaceId: spaces.open },
              { permissions: [read], spaceId: spaces.workerPrivate },
            ],
          }),
        ).expect(201)
      ).body as { token: { id: string } };

      const listed = await request(testApp.getServer())
        .get(`${TOKENS_PATH}/workspace`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);
      const seen = (
        listed.body as {
          hiddenPlaceCount: number;
          id: string;
          owner: { id: string };
          pages: unknown[];
          spaces: { spaceId: string }[];
        }[]
      ).find((token) => token.id === created.token.id);

      expect(seen?.owner.id).toBe(worker.id);
      expect(seen?.spaces.map((grant) => grant.spaceId)).toEqual([spaces.open]);
      expect(seen?.pages).toEqual([]);
      expect(seen?.hiddenPlaceCount).toBe(2);
      expect(JSON.stringify(listed.body)).not.toContain(spaces.workerPrivate);
      expect(JSON.stringify(listed.body)).not.toContain(pages.workerPrivate);
      expect(JSON.stringify(listed.body)).not.toContain(words.workerPrivate);
    });

    it('is refused to anyone who does not run the workspace', async () => {
      await request(testApp.getServer())
        .get(`${TOKENS_PATH}/workspace`)
        .set('Authorization', `Bearer ${worker.token}`)
        .expect(403);
    });
  });
});
