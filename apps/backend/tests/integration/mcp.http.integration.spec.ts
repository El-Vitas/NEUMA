import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import request from 'supertest';
import { MCP_RATE_LIMIT } from '@/common/constants/throttler.constants';
import { PrismaService } from '@/prisma/prisma.service';
import { loginUser, registerUser } from '../helpers/auth.helper';
import { callMcpTool, listenForMcp, listMcpToolNames } from '../helpers/mcp.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

const MCP_PATH = '/api/v1/mcp';

describe('MCP over HTTP (Integration)', () => {
  let testApp: TestApp;
  let baseUrl: string;
  let sessionToken: string;
  let accessTokenSecret: string;

  const createTokenSecret = async (name: string): Promise<string> => {
    const response = await request(testApp.getServer())
      .post('/api/v1/access-tokens')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({ access: { allSpaces: [ACCESS_TOKEN_PERMISSIONS.pagesRead], pages: [], spaces: [] }, name })
      .expect(201);
    return (response.body as { secret: string }).secret;
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    baseUrl = await listenForMcp(testApp);

    const email = `mcp-http-${String(Date.now())}@test.com`;
    const password = 'plainPassword123';
    await registerUser(testApp, { email, name: 'MCP Http', password });
    const session = await loginUser(testApp, email, password);
    sessionToken = session.accessToken;
    accessTokenSecret = await createTokenSecret('Integración HTTP');
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('lets an agent with a personal access token list the tools and call one', async () => {
    const tools = await listMcpToolNames(baseUrl, accessTokenSecret);
    const spaces = await callMcpTool(baseUrl, accessTokenSecret, 'list_spaces', {});

    expect(tools).toContain('list_spaces');
    expect(spaces.isError).not.toBe(true);
  });

  it('turns away a request that brings no token', async () => {
    await request(testApp.getServer()).post(MCP_PATH).send({}).expect(401);
  });

  it('turns away a malformed key the same way as one that does not exist', async () => {
    const malformed = await request(testApp.getServer())
      .post(MCP_PATH)
      .set('Authorization', 'Bearer not-a-key')
      .send({});
    const unknown = await request(testApp.getServer())
      .post(MCP_PATH)
      .set('Authorization', `Bearer cbk_${'a'.repeat(43)}`)
      .send({});

    expect(malformed.status).toBe(401);
    expect(malformed.body).toEqual(unknown.body);
  });

  it('turns away a token whose expiry has passed', async () => {
    const secret = await createTokenSecret('Vencido');
    await testApp
      .get(PrismaService)
      .accessToken.updateMany({ data: { expiresAt: new Date(Date.now() - 60_000) }, where: { name: 'Vencido' } });

    await request(testApp.getServer()).post(MCP_PATH).set('Authorization', `Bearer ${secret}`).send({}).expect(401);
  });

  it('cuts an agent off at its own call limit without touching another token', async () => {
    const busy = await createTokenSecret('En bucle');
    const calm = await createTokenSecret('Tranquilo');
    const callWith = (secret: string) =>
      request(testApp.getServer()).post(MCP_PATH).set('Authorization', `Bearer ${secret}`).send({});

    const statuses: number[] = [];
    for (let call = 0; call < MCP_RATE_LIMIT.perTokenLimit; call += 1) {
      statuses.push((await callWith(busy)).status);
    }

    expect(statuses).not.toContain(429);
    await callWith(busy).expect(429);
    const other = await callWith(calm);
    expect(other.status).not.toBe(429);
  });

  it('turns away several calls sent together in one request, running none of them', async () => {
    const secret = await createTokenSecret('En lote');
    const listTools = (id: number) => ({ id, jsonrpc: '2.0', method: 'tools/list', params: {} });

    const response = await request(testApp.getServer())
      .post(MCP_PATH)
      .set('Authorization', `Bearer ${secret}`)
      .set('Accept', 'application/json, text/event-stream')
      .send([listTools(1), listTools(2)]);

    expect(response.status).toBe(400);
    expect(response.text).not.toContain('"tools"');
  });

  it('turns away a portal session presented as if it were an agent token', async () => {
    await request(testApp.getServer())
      .post(MCP_PATH)
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({})
      .expect(401);
  });

  // Runs last: the cap is counted per address for the whole suite.
  it('cuts off a client that keeps offering keys that do not open', async () => {
    const guess = 'cbk_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const statuses: number[] = [];
    for (let call = 0; call <= MCP_RATE_LIMIT.perIpLimit && !statuses.includes(429); call += 1) {
      const response = await request(testApp.getServer())
        .post(MCP_PATH)
        .set('Authorization', `Bearer ${guess}`)
        .send({});
      statuses.push(response.status);
    }

    expect(statuses.at(-1)).toBe(429);
    expect(new Set(statuses.slice(0, -1))).toEqual(new Set([401]));
  });
});
