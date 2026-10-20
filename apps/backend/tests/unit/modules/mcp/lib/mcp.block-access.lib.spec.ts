import { describe, expect, it } from 'bun:test';
import { PAGE_CONTENT_SCHEMA_VERSION, type PageContent, Result } from '@neuma/shared';
import {
  hideClosedBlocksFromMcpEdit,
  hideClosedMcpBlocks,
  listMcpDocumentBlockIds,
} from '../../../../../src/modules/mcp/lib/mcp.block-access.lib';
import type { McpContentEdit } from '../../../../../src/modules/mcp/types/mcp.pages.types';

const paragraph = (id: string, text: string) => ({
  attrs: { id },
  content: [{ text, type: 'text' as const }],
  type: 'paragraph' as const,
});

const document = (...blocks: ReturnType<typeof paragraph>[]): PageContent => ({
  content: blocks,
  schemaVersion: PAGE_CONTENT_SCHEMA_VERSION,
  type: 'doc',
});

const stored = document(paragraph('open', 'Abierto'), paragraph('closed', 'Cerrado'));

const mentionsBlock =
  (blockId: string): McpContentEdit =>
  (current) =>
    JSON.stringify(current.content).includes(`"id":"${blockId}"`)
      ? Result.ok({ ...current, content: current.content.slice(1) })
      : Result.fail(`The page has no block ${blockId}.`);

describe('listMcpDocumentBlockIds', () => {
  it('names the blocks of a document, nested ones included', () => {
    const nested = {
      content: [{ content: [paragraph('inner', 'Dentro')], type: 'blockquote' }],
      schemaVersion: PAGE_CONTENT_SCHEMA_VERSION,
      type: 'doc',
    };

    expect(listMcpDocumentBlockIds(nested)).toEqual(['inner']);
  });

  it('names nothing for what is not a document', () => {
    expect(listMcpDocumentBlockIds('texto')).toEqual([]);
  });
});

describe('hideClosedMcpBlocks', () => {
  it('drops the blocks that are not readable, and what hangs from them', () => {
    const nested = {
      content: [{ attrs: { id: 'quote' }, content: [paragraph('inner', 'Dentro')], type: 'blockquote' }],
      type: 'doc',
    };

    expect(hideClosedMcpBlocks(nested, new Set())).toEqual({ content: [], type: 'doc' });
    expect(hideClosedMcpBlocks(nested, new Set(['quote', 'inner']))).toEqual(nested);
  });

  it('keeps a document that is not one as it came', () => {
    expect(hideClosedMcpBlocks(null, new Set())).toBeNull();
  });
});

describe('hideClosedBlocksFromMcpEdit', () => {
  it('applies the change to the whole page when it names an open block', () => {
    const written = hideClosedBlocksFromMcpEdit(mentionsBlock('open'), new Set(['open']))(stored).getValue();

    expect(written.content).toEqual(stored.content.slice(1));
  });

  it('fails a change that names a closed block as it fails one that names a block that is not there', () => {
    const closed = hideClosedBlocksFromMcpEdit(mentionsBlock('closed'), new Set(['open']))(stored);
    const missing = hideClosedBlocksFromMcpEdit(mentionsBlock('missing'), new Set(['open']))(stored);

    expect(closed.getError()).toBe('The page has no block closed.');
    expect(missing.getError()).toBe('The page has no block missing.');
  });

  it('keeps the closed blocks in what it writes', () => {
    const dropOpening: McpContentEdit = (current) => Result.ok({ ...current, content: current.content.slice(1) });

    const written = hideClosedBlocksFromMcpEdit(dropOpening, new Set(['open']))(stored).getValue();

    expect(JSON.stringify(written.content)).toContain('Cerrado');
  });
});
