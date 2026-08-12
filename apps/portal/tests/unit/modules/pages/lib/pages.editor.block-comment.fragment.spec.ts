import { describe, expect, it } from 'bun:test';
import type { PageBlockComment, PageContent, PageContentNode } from '@company-brain/shared';
import { TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import {
  createPageEditorBlockCommentCommand,
  createPageEditorBlockCommentRemovalCommand,
} from '@/modules/pages/lib/pages.editor.block-comment.lib';
import {
  openPageEditorBlockRequest,
  openPageEditorFragmentComments,
  readPageEditorBlockRequest,
} from '@/modules/pages/lib/pages.editor.block-menu.lib';
import { createPageEditorState } from '@/modules/pages/lib/pages.editor.lib';

const remark = (id: string): PageBlockComment => ({
  author: 'Admin User',
  body: 'Revisar esta frase',
  createdAt: '2026-08-12T10:00:00.000Z',
  id,
});

const paragraph = (text: string): PageContentNode => ({ content: [{ text, type: 'text' }], type: 'paragraph' });

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

/** Chooses the text between two places of the first block, as dragging over it would. */
const chooseFragment = (view: EditorView, from: number, to: number): void => {
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, from, to)));
};

/** A press on an element, as the page would report it: aimed at that very element. */
const pressOn = (element: Element): MouseEvent => {
  let press: MouseEvent | null = null;
  element.addEventListener('click', (event) => {
    press = event as MouseEvent;
  });
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  if (press === null) throw new Error('the press was not reported');
  return press;
};

const readCommentedText = (view: EditorView): readonly { readonly id: string; readonly text: string }[] => {
  const commented: { id: string; text: string }[] = [];
  view.state.doc.descendants((node) => {
    const mark = node.marks.find((candidate) => candidate.type.name === 'comment');
    if (node.isText && mark !== undefined && typeof node.text === 'string') {
      commented.push({ id: String(mark.attrs.id), text: node.text });
    }
  });
  return commented;
};

describe('commenting a fragment of the text inside a block', () => {
  it('is asked about without losing hold of the chosen text', () => {
    const mounted = mountEditor([paragraph('Una frase larga')]);
    chooseFragment(mounted.view, 5, 10);

    openPageEditorFragmentComments(mounted.view);

    expect(readPageEditorBlockRequest(mounted.view.state)).toEqual({
      blockStart: 0,
      fragment: { from: 5, to: 10 },
      kind: 'comments',
    });
    expect(mounted.view.state.selection.from).toBe(5);
    expect(mounted.view.state.selection.to).toBe(10);

    closeEditor(mounted);
  });

  it('is not asked about when nothing is chosen, since there is no fragment to point at', () => {
    const mounted = mountEditor([paragraph('Una frase larga')]);
    chooseFragment(mounted.view, 5, 5);

    openPageEditorFragmentComments(mounted.view);

    expect(readPageEditorBlockRequest(mounted.view.state)).toBeNull();

    closeEditor(mounted);
  });

  it('marks the chosen text with the remark, and keeps what was said on the block', () => {
    const mounted = mountEditor([paragraph('Una frase larga')]);
    chooseFragment(mounted.view, 5, 10);
    openPageEditorFragmentComments(mounted.view);

    createPageEditorBlockCommentCommand(remark('remark-1'))(mounted.view.state, mounted.view.dispatch);

    expect(readCommentedText(mounted.view)).toEqual([{ id: 'remark-1', text: 'frase' }]);
    expect(mounted.view.state.doc.child(0).attrs.comments).toEqual([remark('remark-1')]);

    closeEditor(mounted);
  });

  it('marks nothing when the remark was left on the block as a whole', () => {
    const mounted = mountEditor([paragraph('Una frase larga')]);
    openPageEditorBlockRequest(mounted.view, 0, 'comments');

    createPageEditorBlockCommentCommand(remark('remark-1'))(mounted.view.state, mounted.view.dispatch);

    expect(readCommentedText(mounted.view)).toEqual([]);
    expect(mounted.view.state.doc.child(0).attrs.comments).toEqual([remark('remark-1')]);

    closeEditor(mounted);
  });

  it('opens what was said when the commented text is clicked', () => {
    const mounted = mountEditor([paragraph('Una frase larga')]);
    chooseFragment(mounted.view, 5, 10);
    openPageEditorFragmentComments(mounted.view);
    createPageEditorBlockCommentCommand(remark('remark-1'))(mounted.view.state, mounted.view.dispatch);
    const commentedText = mounted.container.querySelector('[data-comment-id]');
    if (commentedText === null) throw new Error('the commented fragment was not drawn');

    mounted.view.someProp('handleClick', (answer) => answer(mounted.view, 6, pressOn(commentedText)));

    expect(readPageEditorBlockRequest(mounted.view.state)).toEqual({ blockStart: 0, kind: 'comments' });

    closeEditor(mounted);
  });

  it('takes the mark off the text when the remark is taken away', () => {
    const mounted = mountEditor([paragraph('Una frase larga')]);
    chooseFragment(mounted.view, 5, 10);
    openPageEditorFragmentComments(mounted.view);
    createPageEditorBlockCommentCommand(remark('remark-1'))(mounted.view.state, mounted.view.dispatch);

    createPageEditorBlockCommentRemovalCommand('remark-1')(mounted.view.state, mounted.view.dispatch);

    expect(readCommentedText(mounted.view)).toEqual([]);
    expect(mounted.view.state.doc.child(0).attrs.comments).toBeNull();

    closeEditor(mounted);
  });
});
