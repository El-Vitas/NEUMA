import { describe, expect, it } from 'bun:test';
import type { PageContent, PageContentNode } from '@neuma/shared';
import { EditorView } from 'prosemirror-view';
import { summarizePageEditorDiscussions } from '@/modules/pages/editor/blocks/lib/pages.editor.block-comment.lib';
import { readPageEditorBlockRequest } from '@/modules/pages/editor/blocks/lib/pages.editor.block-menu.lib';
import { createPageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';

const FIRST = '11111111-1111-4111-8111-111111111111';
const SECOND = '22222222-2222-4222-8222-222222222222';

const paragraph = (id: string, text: string): PageContentNode => ({
  attrs: { id },
  content: [{ text, type: 'text' }],
  type: 'paragraph',
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

const findCommentMarks = (container: HTMLElement): readonly HTMLElement[] =>
  Array.from(container.querySelectorAll<HTMLElement>('[data-block-comments]'));

const summary = (counts: readonly (readonly [string, number])[]) => ({
  openCounts: new Map(counts),
  openMarkIds: new Set<string>(),
});

describe('the mark a block with open discussions wears', () => {
  it('is drawn only on the blocks that have open discussions', () => {
    const { container, view } = mountEditor([paragraph(FIRST, 'Uno'), paragraph(SECOND, 'Dos')]);

    view.dispatch(summarizePageEditorDiscussions(view.state, summary([[FIRST, 1]])));
    const marks = findCommentMarks(container);

    expect(marks.length).toBe(1);
    expect(marks[0]?.getAttribute('aria-label')).toBe('Block comments');

    view.destroy();
    container.remove();
  });

  it('says how many open discussions the block carries', () => {
    const { container, view } = mountEditor([paragraph(FIRST, 'Uno')]);

    view.dispatch(summarizePageEditorDiscussions(view.state, summary([[FIRST, 2]])));

    expect(findCommentMarks(container)[0]?.getAttribute('data-block-comments')).toBe('2');

    view.destroy();
    container.remove();
  });

  it('opens the discussions of that block when pressed', () => {
    const { container, view } = mountEditor([paragraph(FIRST, 'Uno'), paragraph(SECOND, 'Dos')]);
    const secondBlock = view.state.doc.child(0).nodeSize;
    view.dispatch(summarizePageEditorDiscussions(view.state, summary([[SECOND, 1]])));

    findCommentMarks(container)[0]?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(readPageEditorBlockRequest(view.state)).toEqual({ blockStart: secondBlock, kind: 'comments' });

    view.destroy();
    container.remove();
  });

  it('goes away when the last open discussion is resolved', () => {
    const { container, view } = mountEditor([paragraph(FIRST, 'Uno')]);
    view.dispatch(summarizePageEditorDiscussions(view.state, summary([[FIRST, 1]])));

    view.dispatch(summarizePageEditorDiscussions(view.state, summary([])));

    expect(findCommentMarks(container).length).toBe(0);

    view.destroy();
    container.remove();
  });
});
