import { describe, expect, it } from 'bun:test';
import { Result } from '@neuma/shared';
import { resolveBlockEditorStart } from '@/modules/pages/block-sync/lib/block-sync.start.lib';
import type { SyncedBlock } from '@/modules/pages/block-sync/types/block-sync.types';
import { documentOf, PAGE_ID, paragraph, syncedBlocksOf, text } from '../block-sync.fixtures';

const written = documentOf(paragraph('p1', text('From the blocks')), paragraph('p2', text('Second')));

describe('resolveBlockEditorStart', () => {
  it('is off when the block editor did not read anything', () => {
    expect(resolveBlockEditorStart(null, PAGE_ID)).toEqual({ blocks: null, content: null, isFailed: false });
  });

  it('starts the editor from the document the blocks say', () => {
    const blocks = syncedBlocksOf(written);

    const start = resolveBlockEditorStart(Result.ok(blocks), PAGE_ID);

    expect(start.isFailed).toBe(false);
    expect(start.blocks).toBe(blocks);
    expect(start.content).toEqual(written);
  });

  it('fails when the blocks could not be read', () => {
    expect(resolveBlockEditorStart(Result.fail(new Error('down')), PAGE_ID)).toEqual({
      blocks: null,
      content: null,
      isFailed: true,
    });
  });

  it('fails when the blocks do not make a page', () => {
    const withoutThePage: readonly SyncedBlock[] = syncedBlocksOf(written).filter((block) => block.id !== PAGE_ID);

    expect(resolveBlockEditorStart(Result.ok(withoutThePage), PAGE_ID)).toEqual({
      blocks: null,
      content: null,
      isFailed: true,
    });
  });
});
