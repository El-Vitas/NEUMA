import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import { ACCESS_TOKEN_PERMISSIONS } from '@neuma/shared';
import request from 'supertest';
import { z } from 'zod';
import { MCP_QUERY_DESCRIPTION } from '@/modules/mcp/constants/mcp.query.constants';
import { PAGE_QUERY_CLOCK } from '@/modules/pages/constants/pages.constants';
import type { PageQueryClock } from '@/modules/pages/types/page-query.types';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { callMcpTool, listenForMcp, readMcpText } from '../helpers/mcp.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

const PASSWORD = 'plainPassword123';

const { collectionsRead, pagesRead } = ACCESS_TOKEN_PERMISSIONS;

const queriedShape = z.object({ rows: z.array(z.object({ title: z.string() })), total: z.number() });

interface Session {
  readonly id: string;
  readonly token: string;
}

/** The moment is the Monday 26 of October 2026 for UTC and still the Sunday 25 for Santiago. */
const AROUND_THE_TURN_OF_THE_WEEK = '2026-10-26T02:30:00Z';

describe('MCP query_collection with relative dates and "@me" (Integration)', () => {
  let testApp: TestApp;
  let baseUrl: string;
  let ana: Session;
  let bo: Session;
  let spaceId: string;
  let collectionId: string;

  const api = () => request(testApp.getServer());

  const signUp = async (label: string, name: string): Promise<Session> => {
    const email = `mcp-relative-${label}-${String(Date.now())}@test.com`;
    await createAccount(testApp, { email, name, password: PASSWORD });
    await testApp.get(PrismaService).models.User.where({ email }).update({ role: 'ADMIN' });
    const session = await loginUser(testApp, email, PASSWORD);
    return { id: session.user.id, token: session.accessToken };
  };

  let tokenCount = 0;

  const tokenOf = async (session: Session): Promise<string> => {
    tokenCount += 1;
    const response = await api()
      .post('/api/v1/access-tokens')
      .set('Authorization', `Bearer ${session.token}`)
      .send({
        access: { allSpaces: [pagesRead, collectionsRead], pages: [], spaces: [] },
        name: `Relative ${String(tokenCount)}`,
      })
      .expect(201);
    return (response.body as { secret: string }).secret;
  };

  const createRow = async (title: string, propertyValues: Record<string, unknown>): Promise<void> => {
    await api()
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set('Authorization', `Bearer ${ana.token}`)
      .send({
        content: { content: [{ content: [], type: 'paragraph' }], schemaVersion: 1, type: 'doc' },
        parentId: collectionId,
        propertyValues,
        title,
      })
      .expect(201);
  };

  const titlesOf = async (secret: string, args: Record<string, unknown>): Promise<string[]> => {
    const answer = await callMcpTool(baseUrl, secret, 'query_collection', {
      collection: collectionId,
      limit: 100,
      ...args,
    });
    expect(answer.isError).not.toBe(true);
    return queriedShape
      .parse(answer.structuredContent)
      .rows.map((row) => row.title)
      .sort();
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    baseUrl = await listenForMcp(testApp);
    ana = await signUp('ana', 'Ana Relativa');
    bo = await signUp('bo', 'Bo Relativo');
    const space = await api()
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${ana.token}`)
      .send({ name: 'Relativo', slug: `relativo-${String(Date.now())}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(201);
    spaceId = (space.body as { id: string }).id;
    const prisma = testApp.get(PrismaService);
    const workspaceId = (await prisma.models.Space.where({ id: spaceId }).first())?.workspaceId ?? '';
    await prisma.models.WorkspaceMember.createAndCount([{ role: 'WORKER', userId: bo.id, workspaceId }], {
      onConflict: 'skip',
    });
    const page = await api()
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set('Authorization', `Bearer ${ana.token}`)
      .send({
        content: { content: [{ content: [], type: 'paragraph' }], schemaVersion: 1, type: 'doc' },
        title: 'Trabajo',
      })
      .expect(201);
    collectionId = (page.body as { id: string }).id;
    await api()
      .post(`/api/v1/spaces/${spaceId}/pages/${collectionId}/schema`)
      .set('Authorization', `Bearer ${ana.token}`)
      .send({
        properties: [
          { key: 'title', label: 'Título', options: null, required: true, type: 'TITLE' },
          {
            config: { allowsMultiple: true },
            key: 'owner',
            label: 'Responsable',
            options: null,
            required: false,
            type: 'PERSON',
          },
          { key: 'due', label: 'Vence', options: null, required: false, type: 'DATE' },
        ],
        views: [{ configuration: {}, isDefault: true, name: 'Tabla', type: 'TABLE' }],
      })
      .expect(201);
    await createRow('de ana, el domingo', { due: { start: '2026-10-25' }, owner: [ana.id] });
    await createRow('de bo, el lunes', { due: { start: '2026-10-26' }, owner: [bo.id] });
    await createRow('de los dos, sin fecha', { owner: [ana.id, bo.id] });
    await createRow('de nadie, el lunes', { due: { start: '2026-10-26' } });
  });

  beforeEach(() => {
    Object.assign(testApp.module.get<PageQueryClock>(PAGE_QUERY_CLOCK), {
      now: () => new Date(AROUND_THE_TURN_OF_THE_WEEK),
    });
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('reads "@me" as the owner of the token, so two agents asking the same get their own rows', async () => {
    const where = [{ column: 'Responsable', operator: 'CONTAINS', value: '@me' }];

    expect(await titlesOf(await tokenOf(ana), { where })).toEqual(['de ana, el domingo', 'de los dos, sin fecha']);
    expect(await titlesOf(await tokenOf(bo), { where })).toEqual(['de bo, el lunes', 'de los dos, sin fecha']);
  });

  it('counts only what is mine as well', async () => {
    const answer = await callMcpTool(baseUrl, await tokenOf(bo), 'query_collection', {
      collection: collectionId,
      limit: 0,
      where: [{ column: 'Responsable', operator: 'CONTAINS', value: '@me' }],
    });

    expect(queriedShape.parse(answer.structuredContent).total).toBe(2);
  });

  it('reads a relative date in the zone the agent names', async () => {
    const secret = await tokenOf(ana);
    const where = [{ column: 'Vence', operator: 'IS', value: '@this_week' }];

    expect(await titlesOf(secret, { timeZone: 'America/Santiago', where })).toEqual(['de ana, el domingo']);
    expect(await titlesOf(secret, { timeZone: 'UTC', where })).toEqual(['de bo, el lunes', 'de nadie, el lunes']);
  });

  it('reads UTC when no zone is named', async () => {
    const where = [{ column: 'Vence', operator: 'IS', value: '@today' }];

    expect(await titlesOf(await tokenOf(ana), { where })).toEqual(['de bo, el lunes', 'de nadie, el lunes']);
  });

  it('asks for what is overdue with a relative day and the operator before', async () => {
    const where = [{ column: 'Vence', operator: 'IS_BEFORE', value: '@today' }];

    expect(await titlesOf(await tokenOf(ana), { timeZone: 'UTC', where })).toEqual(['de ana, el domingo']);
  });

  it('counts the next days from today on', async () => {
    const where = [{ column: 'Vence', operator: 'IS', value: '@next_days:2' }];

    expect(await titlesOf(await tokenOf(ana), { timeZone: 'America/Santiago', where })).toEqual([
      'de ana, el domingo',
      'de bo, el lunes',
      'de nadie, el lunes',
    ]);
  });

  it('refuses a marker that is not one, saying what is understood', async () => {
    const answer = await callMcpTool(baseUrl, await tokenOf(ana), 'query_collection', {
      collection: collectionId,
      where: [{ column: 'Vence', operator: 'IS', value: '@someday' }],
    });

    expect(answer.isError).toBe(true);
    expect(readMcpText(answer)).toContain('@this_week');
  });

  it('refuses a zone that does not exist', async () => {
    const answer = await callMcpTool(baseUrl, await tokenOf(ana), 'query_collection', {
      collection: collectionId,
      timeZone: 'Mars/Olympus',
    });

    expect(answer.isError).toBe(true);
  });

  it('says in its own description how to ask with a relative date and with "@me"', () => {
    expect(MCP_QUERY_DESCRIPTION).toContain('@me');
    expect(MCP_QUERY_DESCRIPTION).toContain('@today');
    expect(MCP_QUERY_DESCRIPTION).toContain('@this_week');
    expect(MCP_QUERY_DESCRIPTION).toContain('@next_days');
    expect(MCP_QUERY_DESCRIPTION).toContain('timeZone');
    expect(MCP_QUERY_DESCRIPTION).toContain('IS_BEFORE');
  });
});
