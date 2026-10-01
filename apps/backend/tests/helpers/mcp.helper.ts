import type { AddressInfo } from 'node:net';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import type { TestApp } from './test-app.helper';

const MCP_PATH = '/api/v1/mcp';

/** Lo que contesta una herramienta, leído como lo lee un agente. */
export interface McpToolAnswer {
  readonly content: readonly { readonly text?: string }[];
  readonly isError?: boolean;
  readonly structuredContent?: unknown;
}

/** La app escuchando en un puerto propio, para que un cliente MCP de verdad se conecte por HTTP. */
export const listenForMcp = async (testApp: TestApp): Promise<string> => {
  await testApp.app.listen(0, '127.0.0.1');
  return `http://127.0.0.1:${String((testApp.getServer().address() as AddressInfo).port)}`;
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

/** Conecta, llama una herramienta y cierra, como un agente que hace una sola pregunta. */
export const callMcpTool = async (
  baseUrl: string,
  secret: string,
  name: string,
  args: Record<string, unknown>,
): Promise<McpToolAnswer> => {
  const client = await connectMcpClient(baseUrl, secret);
  const answer = (await client.callTool({ arguments: args, name })) as McpToolAnswer;
  await client.close();
  return answer;
};

/** Las herramientas que se le ofrecen a un token. */
export const listMcpToolNames = async (baseUrl: string, secret: string): Promise<readonly string[]> => {
  const client = await connectMcpClient(baseUrl, secret);
  const listed = await client.listTools();
  await client.close();
  return listed.tools.map((tool) => tool.name);
};

export const readMcpText = (answer: McpToolAnswer): string => answer.content.map((part) => part.text ?? '').join('\n');
