import { UUID_PATTERN } from '../../../common/constants/validation.constants';
import { MCP_PAGE_IN_PATH_PATTERN } from '../constants/mcp.constants';
import type { McpAddress } from '../types/mcp.types';

const isId = (candidate: string): boolean => UUID_PATTERN.test(candidate);

const toPageAddress = (pageId: string, blockId: string | undefined): McpAddress => {
  if (!isId(pageId)) return { kind: 'invalid' };
  if (blockId === undefined || blockId === '') return { blockId: null, kind: 'page', pageId };
  return isId(blockId) ? { blockId, kind: 'page', pageId } : { kind: 'invalid' };
};

/** Accepts a link, its path, `page#block` or a bare id. Domain and locale are ignored. */
export const readMcpAddress = (address: string): McpAddress => {
  const trimmed = address.trim();
  const [beforeHash = '', blockId] = trimmed.split('#', 2);
  const pageInPath = MCP_PAGE_IN_PATH_PATTERN.exec(beforeHash)?.[1];
  if (pageInPath !== undefined) return toPageAddress(pageInPath, blockId);
  if (blockId !== undefined) return toPageAddress(beforeHash, blockId);
  return isId(trimmed) ? { id: trimmed, kind: 'id' } : { kind: 'invalid' };
};

/** No locale in the URL, so the portal uses the viewer's own. */
export const buildMcpPageUrl = (portalUrl: string, spaceId: string, pageId: string, blockId: string | null): string => {
  const url = new URL(`/spaces/${spaceId}/pages/${pageId}`, portalUrl);
  if (blockId !== null) url.hash = blockId;
  return url.toString();
};

export const readMcpOffset = (cursor: string | undefined): number => (cursor === undefined ? 0 : Number(cursor));
