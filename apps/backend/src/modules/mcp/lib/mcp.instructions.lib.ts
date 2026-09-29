import { MCP_SERVER_INSTRUCTION_LINES } from '../constants/mcp.constants';

/**
 * Lo que el agente lee al conectarse, con la dirección del portal donde corre.
 *
 * Un enlace de Company Brain parece un enlace cualquiera: sin saber de dónde
 * viene, un agente lo abre con un navegador o lo da por inaccesible. Diciéndole
 * con qué empiezan, lo abre con `fetch`.
 */
export const writeMcpServerInstructions = (portalUrl: string): string =>
  [
    ...MCP_SERVER_INSTRUCTION_LINES,
    `Links that start with ${portalUrl} are Company Brain pages or blocks: open them with fetch, never with a browser.`,
  ].join('\n');
