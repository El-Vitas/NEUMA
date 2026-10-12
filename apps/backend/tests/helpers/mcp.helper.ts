import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { z } from 'zod';
import type { TestApp } from './test-app.helper';

const MCP_PATH = '/api/v1/mcp';

const mcpToolAnswerSchema = z.object({
  content: z.array(z.object({ text: z.string().optional() })),
  isError: z.boolean().optional(),
  structuredContent: z.unknown().optional(),
});

export type McpToolAnswer = z.infer<typeof mcpToolAnswerSchema>;

export const listenForMcp = async (testApp: TestApp): Promise<string> => {
  await testApp.app.listen(0, '127.0.0.1');
  const address = testApp.getServer().address();
  if (address === null || typeof address === 'string') throw new Error('The test app is not listening on a port');
  return `http://127.0.0.1:${String(address.port)}`;
};

export const connectMcpClient = async (baseUrl: string, secret: string): Promise<Client> => {
  const client = new Client({ name: 'mcp-integration-test', version: '0.0.1' });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${baseUrl}${MCP_PATH}`), {
      requestInit: { headers: { Authorization: `Bearer ${secret}` } },
    }),
  );
  return client;
};

/** Closes the client even when the callback fails: an open client hangs the test. */
const withMcpClient = async <TResult>(
  baseUrl: string,
  secret: string,
  act: (client: Client) => Promise<TResult>,
): Promise<TResult> => {
  const client = await connectMcpClient(baseUrl, secret);
  try {
    return await act(client);
  } finally {
    await client.close();
  }
};

export const callMcpTool = (
  baseUrl: string,
  secret: string,
  name: string,
  args: Record<string, unknown>,
): Promise<McpToolAnswer> =>
  withMcpClient(baseUrl, secret, async (client) =>
    mcpToolAnswerSchema.parse(await client.callTool({ arguments: args, name })),
  );

export const listMcpToolNames = (baseUrl: string, secret: string): Promise<readonly string[]> =>
  withMcpClient(baseUrl, secret, async (client) => (await client.listTools()).tools.map((tool) => tool.name));

export const readMcpText = (answer: McpToolAnswer): string => answer.content.map((part) => part.text ?? '').join('\n');
