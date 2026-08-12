import { describe, expect, it } from 'bun:test';
import type { PageBlockComment, PageContent, PageContentNode } from '@company-brain/shared';
import { EditorView } from 'prosemirror-view';
import { readPageEditorBlockRequest } from '@/modules/pages/lib/pages.editor.block-menu.lib';
import { createPageEditorState } from '@/modules/pages/lib/pages.editor.lib';

const remark = (id: string): PageBlockComment => ({
  author: 'Admin User',
  body: 'Revisar',
  createdAt: '2026-08-12T10:00:00.000Z',
  id,
});

const paragraph = (text: string, comments?: readonly PageBlockComment[]): PageContentNode => ({
  attrs: comments === undefined ? {} : { comments },
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

describe('the mark a commented block wears', () => {
  it('is drawn only on the blocks that have been talked about', () => {
    const { container, view } = mountEditor([paragraph('Uno', [remark('c1')]), paragraph('Dos')]);

    const marks = findCommentMarks(container);

    expect(marks.length).toBe(1);
    expect(marks[0]?.getAttribute('aria-label')).toBe('Block comments');

    view.destroy();
    container.remove();
  });

  it('says how many remarks the block carries', () => {
    const { container, view } = mountEditor([paragraph('Uno', [remark('c1'), remark('c2')])]);

    expect(findCommentMarks(container)[0]?.getAttribute('data-block-comments')).toBe('2');

    view.destroy();
    container.remove();
  });

  it('opens what was said about that block when pressed', () => {
    const { container, view } = mountEditor([paragraph('Uno'), paragraph('Dos', [remark('c1')])]);
    const secondBlock = view.state.doc.child(0).nodeSize;

    findCommentMarks(container)[0]?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(readPageEditorBlockRequest(view.state)).toEqual({ blockStart: secondBlock, kind: 'comments' });

    view.destroy();
    container.remove();
  });

  it('goes away when the last remark is taken back', () => {
    const { container, view } = mountEditor([paragraph('Uno', [remark('c1')])]);

    view.dispatch(view.state.tr.setNodeAttribute(0, 'comments', null));

    expect(findCommentMarks(container).length).toBe(0);

    view.destroy();
    container.remove();
  });
});
