import { describe, expect, it } from 'bun:test';
import { PageLifecycle } from '@neuma/db';
import { BLOCK_ROLE, type BlockPermissions, type PageContent, USER_ROLE } from '@neuma/shared';
import type { PageContentBlock } from '@/modules/pages/domain/page.block.domain.types';
import {
  dropHiddenBlocks,
  listClosedBlockIds,
  listNodeIds,
  listReadableContentBlocks,
} from '@/modules/pages/domain/page.visibility.domain';

const viewer = { userId: 'user-1', workspaceRole: USER_ROLE.WORKER };
const closed: BlockPermissions = [{ principal: { kind: 'user', userId: 'someone-else' }, role: BLOCK_ROLE.full }];
const opened: BlockPermissions = [{ principal: { kind: 'user', userId: 'user-1' }, role: BLOCK_ROLE.editor }];

const block = (
  id: string,
  parentId: string,
  children: string[] = [],
  permissions: BlockPermissions = null,
): PageContentBlock => ({
  children,
  editedAt: new Date('2026-10-20T00:00:00.000Z'),
  editedById: 'user-1',
  format: null,
  id,
  parentId,
  permissions,
  properties: { title: [] },
  type: 'paragraph',
});

const ids = (blocks: readonly PageContentBlock[]): string[] => blocks.map((entry) => entry.id);

describe('the blocks of a page a viewer may read', () => {
  const page = { children: ['a', 'secret', 'b'], id: 'page-1' };

  it('keeps every block when nothing is closed', () => {
    const blocks = [block('a', 'page-1'), block('secret', 'page-1'), block('b', 'page-1')];

    expect(ids(listReadableContentBlocks(page, null, blocks, viewer).readable)).toEqual(['a', 'secret', 'b']);
  });

  it('leaves out a closed block and everything below it, and names them hidden', () => {
    const blocks = [
      block('a', 'page-1'),
      block('secret', 'page-1', ['inner'], closed),
      block('inner', 'secret'),
      block('b', 'page-1'),
    ];

    const listed = listReadableContentBlocks(page, null, blocks, viewer);

    expect(ids(listed.readable)).toEqual(['a', 'b']);
    expect([...listed.hiddenIds].toSorted()).toEqual(['inner', 'secret']);
  });

  it('lets a block below a closed one that declares its own permissions stay hidden with its parent', () => {
    const blocks = [block('secret', 'page-1', ['inner'], closed), block('inner', 'secret', [], opened)];

    expect(ids(listReadableContentBlocks(page, null, blocks, viewer).readable)).toEqual([]);
  });

  it('applies what the page itself declares to the blocks that declare nothing', () => {
    const blocks = [block('a', 'page-1')];

    expect(ids(listReadableContentBlocks(page, closed, blocks, viewer).readable)).toEqual([]);
    expect(ids(listReadableContentBlocks(page, opened, blocks, viewer).readable)).toEqual(['a']);
  });

  it('lets a block open to the viewer stay in a page that declares otherwise', () => {
    const blocks = [block('a', 'page-1', [], opened)];

    expect(ids(listReadableContentBlocks(page, closed, blocks, viewer).readable)).toEqual(['a']);
  });
});

describe('a document without the blocks the viewer may not read', () => {
  const paragraph = (id: string) => ({
    attrs: { id },
    content: [{ text: id, type: 'text' as const }],
    type: 'paragraph' as const,
  });
  const content: PageContent = {
    content: [
      paragraph('a'),
      { attrs: { id: 'q' }, content: [paragraph('inner')], type: 'blockquote' },
      paragraph('b'),
    ],
    schemaVersion: 1,
    type: 'doc',
  };

  it('drops the node of a hidden block with its subtree, and keeps the rest in order', () => {
    const shown = dropHiddenBlocks(content, new Set(['q']));

    expect(JSON.stringify(shown)).not.toContain('"q"');
    expect(JSON.stringify(shown)).not.toContain('inner');
    expect(shown.content.map((node) => ('attrs' in node ? node.attrs.id : undefined))).toEqual(['a', 'b']);
  });

  it('gives the same document when nothing is hidden', () => {
    expect(dropHiddenBlocks(content, new Set())).toEqual(content);
  });

  it('names the id of every node, the nested ones too', () => {
    expect(listNodeIds(content)).toEqual(['a', 'q', 'inner', 'b']);
  });
});

describe('the blocks of an old version that are closed to the viewer today', () => {
  const link = (id: string, permissions: BlockPermissions = null) => ({
    id,
    lifecycle: PageLifecycle.ACTIVE,
    permissions,
  });

  it('closes a block that declares the viewer out, even when the block is no longer in the page', () => {
    const chains = new Map([
      ['secret', [link('secret', closed), link('page-1')]],
      ['open', [link('open'), link('page-1')]],
    ]);

    expect([...listClosedBlockIds(chains, viewer)]).toEqual(['secret']);
  });

  it('closes a block that inherits the permissions of a closed ancestor', () => {
    const chains = new Map([['inner', [link('inner'), link('secret', closed), link('page-1')]]]);

    expect([...listClosedBlockIds(chains, viewer)]).toEqual(['inner']);
  });

  it('lets a block open to the viewer be read under a closed page', () => {
    const chains = new Map([['inner', [link('inner', opened), link('page-1', closed)]]]);

    expect([...listClosedBlockIds(chains, viewer)]).toEqual([]);
  });

  it('has nothing to close for a block that left no trace', () => {
    expect([...listClosedBlockIds(new Map([['gone', []]]), viewer)]).toEqual([]);
  });
});
