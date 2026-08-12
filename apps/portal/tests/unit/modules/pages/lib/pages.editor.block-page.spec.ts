import { describe, expect, it } from 'bun:test';
import type { PageContent, PageContentNode } from '@company-brain/shared';
import { EditorView } from 'prosemirror-view';
import {
  createPageEditorBlockLinkCommand,
  createPageEditorBlockRangeRemovalCommand,
  readPageEditorBlocksContent,
  readPageEditorBlocksTitle,
} from '@/modules/pages/lib/pages.editor.block-page.lib';
import { createPageEditorState } from '@/modules/pages/lib/pages.editor.lib';

const paragraph = (text: string): PageContentNode => ({ content: [{ text, type: 'text' }], type: 'paragraph' });

const nested = (parent: string, child: string): PageContentNode => ({
  content: [paragraph(parent), { content: [paragraph(child)], type: 'block_children' }],
  type: 'nested_block',
});

const mountEditor = (content: PageContentNode[]): { readonly container: HTMLElement; readonly view: EditorView } => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const pageContent: PageContent = { content, schemaVersion: 1, type: 'doc' };
  const view = new EditorView(container, {
    state: createPageEditorState(pageContent, 'Select block', 'Insert block', 'Block comments'),
  });
  return { container, view };
};

const closeEditor = (mounted: { readonly container: HTMLElement; readonly view: EditorView }): void => {
  mounted.view.destroy();
  mounted.container.remove();
};

/** The whole of the first block, as a drag from its grip would take it. */
const firstBlock = (view: EditorView): { readonly from: number; readonly to: number } => ({
  from: 0,
  to: view.state.doc.child(0).nodeSize,
});

describe('blocks that become a page of their own', () => {
  it('are read as a page, with whatever hangs from them', () => {
    const mounted = mountEditor([nested('Padre', 'Hijo'), paragraph('Se queda')]);

    const content = readPageEditorBlocksContent(mounted.view.state, firstBlock(mounted.view));

    expect(content?.content).toHaveLength(1);
    expect(content?.content[0]?.type).toBe('nested_block');

    closeEditor(mounted);
  });

  it('are named after what the first of them says', () => {
    const mounted = mountEditor([nested('Padre', 'Hijo'), paragraph('Se queda')]);

    expect(readPageEditorBlocksTitle(mounted.view.state, firstBlock(mounted.view))).toBe('Padre');

    closeEditor(mounted);
  });

  it('are named with nothing when they say nothing, so the page can be named later', () => {
    const mounted = mountEditor([paragraph('   '), paragraph('Se queda')]);

    expect(readPageEditorBlocksTitle(mounted.view.state, firstBlock(mounted.view))).toBe('');

    closeEditor(mounted);
  });

  it('leave the page they were on once they are somewhere else', () => {
    const mounted = mountEditor([nested('Padre', 'Hijo'), paragraph('Se queda')]);

    createPageEditorBlockRangeRemovalCommand(firstBlock(mounted.view))(mounted.view.state, mounted.view.dispatch);

    expect(mounted.view.state.doc.childCount).toBe(1);
    expect(mounted.view.state.doc.child(0).textContent).toBe('Se queda');

    closeEditor(mounted);
  });

  it('leave a link to the page they became where they used to be', () => {
    const mounted = mountEditor([nested('Padre', 'Hijo'), paragraph('Se queda')]);

    createPageEditorBlockLinkCommand({
      label: 'Padre',
      pageId: '22222222-2222-4222-8222-222222222222',
      range: firstBlock(mounted.view),
      spaceId: 'space-1',
    })(mounted.view.state, mounted.view.dispatch);

    expect(mounted.view.state.doc.childCount).toBe(2);
    const link = mounted.view.state.doc.child(0).child(0);
    expect(link.type.name).toBe('mention');
    expect(link.attrs.pageId).toBe('22222222-2222-4222-8222-222222222222');
    expect(mounted.view.state.doc.child(1).textContent).toBe('Se queda');

    closeEditor(mounted);
  });

  it('leave nothing behind when there is no page to point at', () => {
    const mounted = mountEditor([paragraph('Uno'), paragraph('Se queda')]);

    const ran = createPageEditorBlockLinkCommand({
      label: 'Uno',
      pageId: '',
      range: firstBlock(mounted.view),
      spaceId: 'space-1',
    })(mounted.view.state, mounted.view.dispatch);

    expect(ran).toBe(false);
    expect(mounted.view.state.doc.child(0).textContent).toBe('Uno');

    closeEditor(mounted);
  });

  it('leave a page one can still write in when they were all of it', () => {
    const mounted = mountEditor([paragraph('Todo lo que habia')]);

    createPageEditorBlockRangeRemovalCommand(firstBlock(mounted.view))(mounted.view.state, mounted.view.dispatch);

    expect(mounted.view.state.doc.childCount).toBe(1);
    expect(mounted.view.state.doc.child(0).type.name).toBe('paragraph');
    expect(mounted.view.state.doc.child(0).textContent).toBe('');

    closeEditor(mounted);
  });
});
