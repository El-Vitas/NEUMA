import { MCP_SERVER_INSTRUCTION_LINES } from '../constants/mcp.constants';

/** Names the portal URL so agents open Company Brain links with `fetch` instead of a browser. */
export const writeMcpServerInstructions = (portalUrl: string): string =>
  [
    ...MCP_SERVER_INSTRUCTION_LINES,
    `Links that start with ${portalUrl} are Company Brain pages or blocks: open them with fetch, never with a browser.`,
  ].join('\n');
