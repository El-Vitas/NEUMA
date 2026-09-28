import { describe, expect, test } from 'bun:test';
import { ACCESS_TOKEN_PERMISSIONS, USER_ROLE } from '@company-brain/shared';
import {
  buildMcpSearchScope,
  canMcpPrincipalSeeSpace,
  listMcpPageRuleProbes,
  listMcpToolsOffered,
  permitsListing,
  permitsPageReading,
} from '../../../../../src/modules/mcp/lib/mcp.access.lib';
import type { McpPrincipal, McpToolDefinition } from '../../../../../src/modules/mcp/types/mcp.types';

const read = ACCESS_TOKEN_PERMISSIONS.pagesRead;
const collectionsRead = ACCESS_TOKEN_PERMISSIONS.collectionsRead;
const noReach = { allowedPageIds: [], closedPageIds: [], spaceIdsWithAllowedPages: [] };

const principalWith = (access: Partial<McpPrincipal['access']>): McpPrincipal => ({
  access: { allSpaces: [], pages: [], spaces: [], ...access },
  role: USER_ROLE.WORKER,
  tokenId: 'token-1',
  userId: 'user-1',
  workspaceId: 'workspace-1',
});

const readEverywhere = principalWith({ allSpaces: [read] });
const readOnlyProduct = principalWith({ spaces: [{ permissions: [read], spaceId: 'product' }] });
const everythingButHr = principalWith({ allSpaces: [read], spaces: [{ permissions: [], spaceId: 'hr' }] });
const onlyOnePage = principalWith({ pages: [{ pageId: 'spec', permissions: [read] }] });
const onlyCollectionsInProduct = principalWith({ spaces: [{ permissions: [collectionsRead], spaceId: 'product' }] });

const noop = (): void => undefined;
const tool = (name: string, requires: McpToolDefinition['requires']): McpToolDefinition => ({
  name,
  register: noop,
  requires,
});

describe('qué espacios ve un token', () => {
  test('sees every space its owner sees when it reads everywhere, except the ones it closes', () => {
    expect(canMcpPrincipalSeeSpace(everythingButHr, 'product', noReach)).toBe(true);
    expect(canMcpPrincipalSeeSpace(everythingButHr, 'hr', noReach)).toBe(false);
  });

  test('sees only the spaces it was given', () => {
    expect(canMcpPrincipalSeeSpace(readOnlyProduct, 'product', noReach)).toBe(true);
    expect(canMcpPrincipalSeeSpace(readOnlyProduct, 'engineering', noReach)).toBe(false);
  });

  /** Una página dada deja ver su espacio, para que el agente sepa dónde está; lo demás del espacio sigue cerrado. */
  test('sees the space of a page it was given, and no other', () => {
    const reach = { allowedPageIds: ['spec'], closedPageIds: [], spaceIdsWithAllowedPages: ['product'] };

    expect(canMcpPrincipalSeeSpace(onlyOnePage, 'product', reach)).toBe(true);
    expect(canMcpPrincipalSeeSpace(onlyOnePage, 'engineering', reach)).toBe(false);
  });

  /** Ver las filas de una colección también es ver el espacio: sin eso, no sabría dónde están. */
  test('sees a space where it can only read collections', () => {
    expect(canMcpPrincipalSeeSpace(onlyCollectionsInProduct, 'product', noReach)).toBe(true);
  });
});

describe('cómo se prueba cada regla de página', () => {
  test('asks each page rule whether it lets the page be read', () => {
    const principal = principalWith({
      pages: [
        { pageId: 'hr', permissions: [] },
        { pageId: 'holidays', permissions: [read] },
        { pageId: 'board', permissions: [collectionsRead] },
      ],
    });

    expect(listMcpPageRuleProbes(principal, permitsPageReading)).toEqual([
      { allows: false, pageId: 'hr' },
      { allows: true, pageId: 'holidays' },
      { allows: false, pageId: 'board' },
    ]);
    expect(listMcpPageRuleProbes(principal, permitsListing).map((probe) => probe.allows)).toEqual([false, true, true]);
  });
});

describe('dónde busca un token', () => {
  test('searches everything its owner sees when it reads pages everywhere', () => {
    expect(buildMcpSearchScope(readEverywhere, noReach)).toEqual({
      allowedPageIds: [],
      closedPageIds: [],
      closedSpaceIds: [],
      openSpaceIds: [],
      readsEverywhere: true,
    });
  });

  test('closes the spaces and pages its rules close, and opens the pages they open', () => {
    const reach = {
      allowedPageIds: ['holidays'],
      closedPageIds: ['hr', 'salaries'],
      spaceIdsWithAllowedPages: ['product'],
    };

    expect(buildMcpSearchScope(everythingButHr, reach)).toEqual({
      allowedPageIds: ['holidays'],
      closedPageIds: ['hr', 'salaries'],
      closedSpaceIds: ['hr'],
      openSpaceIds: [],
      readsEverywhere: true,
    });
  });

  /** Sin leer páginas en ningún lugar, buscar no encuentra nada, en vez de encontrar todo. */
  test('searches nowhere when it reads pages nowhere', () => {
    expect(buildMcpSearchScope(onlyCollectionsInProduct, noReach)).toEqual({
      allowedPageIds: [],
      closedPageIds: [],
      closedSpaceIds: ['product'],
      openSpaceIds: [],
      readsEverywhere: false,
    });
  });
});

describe('qué herramientas se le ofrecen', () => {
  const tools = [
    tool('list_spaces', [read, collectionsRead]),
    tool('read_page', [read]),
    tool('create_page', [ACCESS_TOKEN_PERMISSIONS.pagesWrite]),
  ];

  /** Una herramienta que el token no puede usar no se ofrece: es un nombre más entre los que elegir, y siempre fallaría. */
  test('offers only the tools the token holds a permission for, pages included', () => {
    expect(listMcpToolsOffered(tools, readOnlyProduct).map((offered) => offered.name)).toEqual([
      'list_spaces',
      'read_page',
    ]);
    expect(listMcpToolsOffered(tools, onlyOnePage).map((offered) => offered.name)).toEqual([
      'list_spaces',
      'read_page',
    ]);
  });

  test('does not offer writing tools to a token whose owner can only read', () => {
    const client = {
      ...principalWith({ allSpaces: [ACCESS_TOKEN_PERMISSIONS.pagesWrite, read] }),
      role: USER_ROLE.CLIENT,
    };

    expect(listMcpToolsOffered(tools, client).map((offered) => offered.name)).not.toContain('create_page');
  });

  /** Sin identidad al arrancar no hay con qué recortar: se ofrecen todas y cada llamada dice qué pasa con la llave. */
  test('offers every tool when there is no principal to go by', () => {
    expect(listMcpToolsOffered(tools, null)).toHaveLength(tools.length);
  });
});
