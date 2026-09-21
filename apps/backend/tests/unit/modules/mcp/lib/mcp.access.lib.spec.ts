import { describe, expect, test } from 'bun:test';
import { ACCESS_TOKEN_PERMISSIONS, USER_ROLE } from '@company-brain/shared';
import {
  canMcpPrincipalReadSpace,
  listMcpToolsOffered,
  readMcpSearchSpaces,
} from '../../../../../src/modules/mcp/lib/mcp.access.lib';
import type { McpPrincipal, McpToolDefinition } from '../../../../../src/modules/mcp/types/mcp.types';

const principalWith = (access: McpPrincipal['access']): McpPrincipal => ({
  access,
  role: USER_ROLE.WORKER,
  tokenId: 'token-1',
  userId: 'user-1',
  workspaceId: 'workspace-1',
});

const readEverywhere = principalWith({ allSpaces: [ACCESS_TOKEN_PERMISSIONS.pagesRead], spaces: [] });
const readOnlyProduct = principalWith({
  allSpaces: [],
  spaces: [{ permissions: [ACCESS_TOKEN_PERMISSIONS.pagesRead], spaceId: 'product' }],
});
const onlyCollectionsInProduct = principalWith({
  allSpaces: [],
  spaces: [{ permissions: [ACCESS_TOKEN_PERMISSIONS.collectionsRead], spaceId: 'product' }],
});

const noop = (): void => undefined;
const tool = (name: string, requires: McpToolDefinition['requires']): McpToolDefinition => ({
  name,
  register: noop,
  requires,
});

describe('en qué espacios lee un token', () => {
  test('reads every space its owner sees when it was given reading everywhere', () => {
    expect(canMcpPrincipalReadSpace(readEverywhere, 'anything')).toBe(true);
  });

  test('reads only the spaces it was given', () => {
    expect(canMcpPrincipalReadSpace(readOnlyProduct, 'product')).toBe(true);
    expect(canMcpPrincipalReadSpace(readOnlyProduct, 'engineering')).toBe(false);
  });

  /** Ver las filas de una colección también es ver el espacio: sin eso, no sabría dónde están. */
  test('sees a space where it can only read collections', () => {
    expect(canMcpPrincipalReadSpace(onlyCollectionsInProduct, 'product')).toBe(true);
  });
});

describe('dónde busca un token', () => {
  test('searches everything its owner sees when it reads pages everywhere', () => {
    expect(readMcpSearchSpaces(readEverywhere)).toBeUndefined();
  });

  test('searches only the spaces where it reads pages', () => {
    expect(readMcpSearchSpaces(readOnlyProduct)).toEqual(['product']);
  });

  /** Sin leer páginas en ningún espacio, buscar no encuentra nada, en vez de encontrar todo. */
  test('searches nowhere when it reads pages in no space', () => {
    expect(readMcpSearchSpaces(onlyCollectionsInProduct)).toEqual([]);
  });
});

describe('qué herramientas se le ofrecen', () => {
  const tools = [
    tool('list_spaces', [ACCESS_TOKEN_PERMISSIONS.pagesRead, ACCESS_TOKEN_PERMISSIONS.collectionsRead]),
    tool('read_page', [ACCESS_TOKEN_PERMISSIONS.pagesRead]),
    tool('create_page', [ACCESS_TOKEN_PERMISSIONS.pagesWrite]),
  ];

  /** Una herramienta que el token no puede usar no se ofrece: es un nombre más entre los que elegir, y siempre fallaría. */
  test('offers only the tools the token holds a permission for', () => {
    expect(listMcpToolsOffered(tools, readOnlyProduct).map((offered) => offered.name)).toEqual([
      'list_spaces',
      'read_page',
    ]);
  });

  test('does not offer writing tools to a token whose owner can only read', () => {
    const client = {
      ...principalWith({
        allSpaces: [ACCESS_TOKEN_PERMISSIONS.pagesWrite, ACCESS_TOKEN_PERMISSIONS.pagesRead],
        spaces: [],
      }),
      role: USER_ROLE.CLIENT,
    };

    expect(listMcpToolsOffered(tools, client).map((offered) => offered.name)).not.toContain('create_page');
  });

  /** Sin identidad al arrancar no hay con qué recortar: se ofrecen todas y cada llamada dice qué pasa con la llave. */
  test('offers every tool when there is no principal to go by', () => {
    expect(listMcpToolsOffered(tools, null)).toHaveLength(tools.length);
  });
});
