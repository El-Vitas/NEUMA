import type { AuthInfo } from '@modelcontextprotocol/server';
import type { FastifyRequest } from 'fastify';
import { MCP_ACCESS_TOKEN_CLIENT_ID, MCP_WEB_REQUEST_ORIGIN } from '../constants/mcp.constants';
import { mcpPrincipalSchema } from '../schemas/mcp.principal.schemas';
import type { McpPrincipal } from '../types/mcp.types';

/**
 * La identidad ya validada, en la forma en que el SDK la lleva hasta el servidor.
 *
 * El secreto no viaja: quien la recibe solo necesita saber en nombre de quién
 * actúa, y un secreto que pasa por menos manos se filtra por menos sitios.
 */
export const toMcpAuthInfo = (principal: McpPrincipal): AuthInfo => ({
  clientId: MCP_ACCESS_TOKEN_CLIENT_ID,
  extra: { ...principal },
  scopes: [],
  token: '',
});

/** La identidad que viene dentro de la petición, o nadie si no viene con la forma esperada. */
export const readMcpPrincipal = (authInfo: AuthInfo | undefined): McpPrincipal | null => {
  const parsed = mcpPrincipalSchema.safeParse(authInfo?.extra);
  return parsed.success ? parsed.data : null;
};

const toWebHeaders = (request: FastifyRequest): Headers => {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === 'string') headers.set(name, value);
    if (Array.isArray(value)) for (const one of value) headers.append(name, one);
  }
  return headers;
};

/**
 * La petición de Fastify como petición web. El cuerpo no se copia: ya viene
 * leído y va aparte. El origen es fijo porque el manejador del MCP solo mira la
 * ruta, y el `Host` lo escribe quien llama: uno mal formado no debe romper la
 * petición.
 */
export const toWebRequest = (request: FastifyRequest): Request =>
  new Request(new URL(request.url, MCP_WEB_REQUEST_ORIGIN), {
    headers: toWebHeaders(request),
    method: request.method,
  });
