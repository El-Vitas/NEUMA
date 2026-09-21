import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { AddressInfo } from 'node:net';
import { ACCESS_TOKEN_PERMISSIONS } from '@company-brain/shared';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import request from 'supertest';
import { MCP_RATE_LIMIT } from '@/common/constants/throttler.constants';
import { loginUser, registerUser } from '../helpers/auth.helper';
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
      .send({ access: { allSpaces: [ACCESS_TOKEN_PERMISSIONS.pagesRead], spaces: [] }, name })
      .expect(201);
    return (response.body as { secret: string }).secret;
  };

  const connectClient = async (secret: string): Promise<Client> => {
    const client = new Client({ name: 'integration-test', version: '0.0.1' });
    const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}${MCP_PATH}`), {
      requestInit: { headers: { Authorization: `Bearer ${secret}` } },
    });
    await client.connect(transport);
    return client;
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    await testApp.app.listen(0, '127.0.0.1');
    const address = testApp.getServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${String(address.port)}`;

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
    const client = await connectClient(accessTokenSecret);

    const tools = await client.listTools();
    const spaces = await client.callTool({ arguments: {}, name: 'list_spaces' });
    await client.close();

    expect(tools.tools.map((tool) => tool.name)).toContain('list_spaces');
    expect(spaces.isError).not.toBe(true);
  });

  it('turns away a request that brings no token', async () => {
    await request(testApp.getServer()).post(MCP_PATH).send({}).expect(401);
  });

  /**
   * Un agente en bucle se corta en su propio tope, y el tope es de su token:
   * otro agente de la misma persona sigue trabajando.
   */
  it('cuts an agent off at its own call limit without touching another token', async () => {
    const busy = await createTokenSecret('En bucle');
    const calm = await createTokenSecret('Tranquilo');
    const callWith = (secret: string) =>
      request(testApp.getServer()).post(MCP_PATH).set('Authorization', `Bearer ${secret}`).send({});

    for (let call = 0; call < MCP_RATE_LIMIT.perTokenLimit; call += 1) {
      await callWith(busy);
    }

    await callWith(busy).expect(429);
    const other = await callWith(calm);
    expect(other.status).not.toBe(429);
  });

  /** Una sesión del portal no es una llave de agente: si se filtra una, no abre la otra puerta. */
  it('turns away a portal session presented as if it were an agent token', async () => {
    await request(testApp.getServer())
      .post(MCP_PATH)
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({})
      .expect(401);
  });
});
