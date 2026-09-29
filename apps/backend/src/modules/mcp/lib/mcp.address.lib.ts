import { UUID_PATTERN } from '../../../common/constants/validation.constants';
import { MCP_PAGE_IN_PATH_PATTERN } from '../constants/mcp.constants';
import type { McpAddress } from '../types/mcp.types';

const isId = (candidate: string): boolean => UUID_PATTERN.test(candidate);

/** La página y el bloque de una dirección, si los dos son ids; si alguno no lo es, la dirección no sirve. */
const toPageAddress = (pageId: string, blockId: string | undefined): McpAddress => {
  if (!isId(pageId)) return { kind: 'invalid' };
  if (blockId === undefined || blockId === '') return { blockId: null, kind: 'page', pageId };
  return isId(blockId) ? { blockId, kind: 'page', pageId } : { kind: 'invalid' };
};

/**
 * Lee lo que el agente pasó para abrir algo: un enlace copiado del portal, solo
 * su ruta, una página con su bloque (`página#bloque`) o un id suelto.
 *
 * El dominio y el idioma del enlace no importan: lo que manda es la página y el
 * bloque. Así sirve el enlace que una persona copió en su idioma, en su portal.
 */
export const readMcpAddress = (address: string): McpAddress => {
  const trimmed = address.trim();
  const [beforeHash = '', blockId] = trimmed.split('#', 2);
  const pageInPath = MCP_PAGE_IN_PATH_PATTERN.exec(beforeHash)?.[1];
  if (pageInPath !== undefined) return toPageAddress(pageInPath, blockId);
  if (blockId !== undefined) return toPageAddress(beforeHash, blockId);
  return isId(trimmed) ? { id: trimmed, kind: 'id' } : { kind: 'invalid' };
};

/** El enlace que abre una persona. Sin idioma, para que el portal use el suyo. */
export const buildMcpPageUrl = (portalUrl: string, spaceId: string, pageId: string, blockId: string | null): string => {
  const url = new URL(`/spaces/${spaceId}/pages/${pageId}`, portalUrl);
  if (blockId !== null) url.hash = blockId;
  return url.toString();
};
