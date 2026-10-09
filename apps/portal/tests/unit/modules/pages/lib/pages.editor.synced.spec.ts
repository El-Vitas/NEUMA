import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@company-brain/shared';
import { NodeSelection } from 'prosemirror-state';
import { createPageEditorState, serializePageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';
import { pageEditorSchema } from '@/modules/pages/editor/lib/pages.editor.schema';
import { isBorrowedDrawing } from '@/modules/pages/editor/structure/lib/pages.editor.synced.drawing.lib';
import {
  buildSyncedBlockContent,
  createPageUnsyncCommand,
  readBorrowedBlock,
  readSyncedTarget,
} from '@/modules/pages/editor/structure/lib/pages.editor.synced.lib';

const source: PageContent = {
  content: [
    {
      attrs: { id: 'block-outer' },
      content: [
        {
          attrs: { id: 'block-inner' },
          content: [{ text: 'Lo que se comparte', type: 'text' }],
          type: 'paragraph',
        },
      ],
      type: 'blockquote',
    },
  ],
  schemaVersion: 1,
  type: 'doc',
};

const pageShowingIt: PageContent = {
  content: [{ attrs: { blockId: 'block-inner', pageId: 'page-1', spaceId: 'space-1' }, type: 'synced' }],
  schemaVersion: 1,
  type: 'doc',
};

const pages = [{ content: source, id: 'page-1' }];

describe('readBorrowedBlock', () => {
  it('finds the block however deeply its page holds it, and says nothing about one that is gone', () => {
    const borrowed = readBorrowedBlock(pages, 'page-1', 'block-inner');

    expect(borrowed?.textContent).toBe('Lo que se comparte');
    expect(readBorrowedBlock(pages, 'page-1', 'block-gone')).toBeNull();
    expect(readBorrowedBlock(pages, 'page-9', 'block-inner')).toBeNull();
  });
});

describe('buildSyncedBlockContent', () => {
  it('sends one block that says where the writing lives, and nothing of the writing itself', () => {
    const sent = buildSyncedBlockContent({ blockId: 'block-inner', pageId: 'page-1', spaceId: 'space-1' });

    expect(sent.content).toHaveLength(1);
    expect(JSON.stringify(sent)).toContain('"type":"synced"');
    expect(JSON.stringify(sent)).not.toContain('Lo que se comparte');
  });
});

describe('createPageUnsyncCommand', () => {
  it('leaves a copy that is nobody else’s: the same writing, without who the other block is', () => {
    const state = createPageEditorState(pageShowingIt, 'Select', 'Insert', 'Comments', 'Write here', 'Fold');
    const chosen = state.apply(state.tr.setSelection(NodeSelection.create(state.doc, 0)));
    const target = readSyncedTarget(chosen);
    let kept: PageContent | null = null;

    expect(target?.blockId).toBe('block-inner');
    if (target !== null) {
      createPageUnsyncCommand(
        pageEditorSchema,
        target,
        readBorrowedBlock(pages, 'page-1', 'block-inner'),
      )(chosen, (transaction) => {
        kept = serializePageEditorState(chosen.apply(transaction));
      });
    }

    expect(JSON.stringify(kept)).toContain('Lo que se comparte');
    expect(JSON.stringify(kept)).not.toContain('"type":"synced"');
    expect(JSON.stringify(kept)).not.toContain('block-inner');
  });
});

describe('isBorrowedDrawing', () => {
  /** Un diagrama prestado se dibuja, como en su página; mostrar su código haría creer que se rompió. */
  it('is a diagram or a formula shown as its drawing, and not code, nor a drawing shown only as its code', () => {
    const code = (language: string | null, shown: string | null = null) =>
      pageEditorSchema.nodes.code_block.create({ language, shown }, pageEditorSchema.text('x'));

    expect(isBorrowedDrawing(code('mermaid'))).toBe(true);
    expect(isBorrowedDrawing(code('latex'))).toBe(true);
    expect(isBorrowedDrawing(code('typescript'))).toBe(false);
    expect(isBorrowedDrawing(code('mermaid', 'code'))).toBe(false);
    expect(isBorrowedDrawing(pageEditorSchema.nodes.paragraph.create())).toBe(false);
  });
});
