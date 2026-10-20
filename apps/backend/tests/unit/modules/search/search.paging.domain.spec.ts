import { describe, expect, test } from 'bun:test';
import { BLOCK_ROLE, type BlockViewer } from '@neuma/shared';
import { mayHaveMoreRows, takeReadable } from '@/modules/search/domain/search.paging.domain';
import type { DeclaringAncestor, SearchCandidate } from '@/modules/search/types/search.types';

const viewer: BlockViewer = { userId: 'user-1', workspaceRole: 'WORKER' };

const candidate = (blockId: string, overrides: Partial<SearchCandidate> = {}): SearchCandidate => ({
  blockId,
  blockType: 'paragraph',
  chain: [],
  editedAt: new Date('2026-10-20T00:00:00.000Z'),
  headings: [],
  icon: null,
  isPageVerified: false,
  pageChain: [],
  pageId: 'page-1',
  pageParentId: null,
  pageRank: 1,
  pageTitle: 'Page',
  parentPageTitle: null,
  rank: 1,
  snippet: '',
  spaceId: 'space-1',
  spaceName: 'Space',
  ...overrides,
});

const closedToOthers: DeclaringAncestor = {
  depth: 1,
  id: 'secret',
  permissions: [{ principal: { kind: 'user', userId: 'other' }, role: BLOCK_ROLE.full }],
};

const opensToViewer: DeclaringAncestor = {
  depth: 1,
  id: 'shared',
  permissions: [{ principal: { kind: 'user', userId: 'user-1' }, role: BLOCK_ROLE.editor }],
};

const hidden = (blockId: string, overrides: Partial<SearchCandidate> = {}): SearchCandidate =>
  candidate(blockId, { chain: [closedToOthers], ...overrides });

describe('takeReadable for blocks', () => {
  test('skips what the viewer cannot read and keeps the order', () => {
    const { taken } = takeReadable([candidate('a'), hidden('b'), candidate('c')], viewer, 10, 'block');

    expect(taken.map((row) => row.blockId)).toEqual(['a', 'c']);
  });

  test('stops at the room left and says a next page exists when a readable row is left over', () => {
    const slice = takeReadable([candidate('a'), candidate('b'), candidate('c')], viewer, 2, 'block');

    expect(slice.taken.map((row) => row.blockId)).toEqual(['a', 'b']);
    expect(slice.hasSurplus).toBe(true);
  });

  test('does not call a hidden leftover a next page', () => {
    const slice = takeReadable([candidate('a'), hidden('b')], viewer, 1, 'block');

    expect(slice.hasSurplus).toBe(false);
  });
});

describe('takeReadable for pages', () => {
  test('lets the best readable match stand for the page', () => {
    const rows = [hidden('best'), candidate('second'), candidate('third')];

    const { taken } = takeReadable(rows, viewer, 10, 'page');

    expect(taken.map((row) => row.blockId)).toEqual(['second']);
  });

  test('shows a page through a match under a rule that opens to the viewer', () => {
    const rows = [candidate('shared-match', { chain: [opensToViewer] })];

    expect(takeReadable(rows, viewer, 10, 'page').taken).toHaveLength(1);
  });

  test('never shows a page whose only matches the viewer cannot read', () => {
    expect(takeReadable([hidden('a'), hidden('b')], viewer, 10, 'page').taken).toEqual([]);
  });

  test('never shows a page the viewer cannot read, however readable the match', () => {
    const rows = [candidate('a', { pageChain: [closedToOthers] })];

    expect(takeReadable(rows, viewer, 10, 'page').taken).toEqual([]);
  });

  test('gives one result per page', () => {
    const rows = [candidate('a'), candidate('b'), candidate('c', { pageId: 'page-2' })];

    expect(takeReadable(rows, viewer, 10, 'page').taken.map((row) => row.blockId)).toEqual(['a', 'c']);
  });
});

describe('mayHaveMoreRows', () => {
  test('is false for a short batch', () => {
    expect(mayHaveMoreRows([candidate('a')], 5, 'block')).toBe(false);
  });

  test('is true for a full batch of blocks', () => {
    expect(mayHaveMoreRows([candidate('a'), candidate('b')], 2, 'block')).toBe(true);
  });

  test('counts a page once however many of its matches came with it', () => {
    const rows = [candidate('a'), candidate('b'), candidate('c')];

    expect(mayHaveMoreRows(rows, 2, 'page')).toBe(false);
  });
});
