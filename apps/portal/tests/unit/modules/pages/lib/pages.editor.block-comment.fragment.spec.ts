import { describe, expect, it } from 'bun:test';
import type { PageContent, PageContentNode } from '@neuma/shared';
import { TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import {
  createPageEditorCommentMarkCommand,
  summarizePageEditorDiscussions,
} from '@/modules/pages/editor/blocks/lib/pages.editor.block-comment.lib';
import {
  openPageEditorFragmentComments,
  readPageEditorBlockRequest,
} from '@/modules/pages/editor/blocks/lib/pages.editor.block-menu.lib';
import { createPageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';

const BLOCK = '11111111-1111-4111-8111-111111111111';
const DISCUSSION = '33333333-3333-4333-8333-333333333333';

const paragraph = (text: string): PageContentNode => ({
  attrs: { id: BLOCK },
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

const closeEditor = (mounted: { readonly container: HTMLElement; readonly view: EditorView }): void => {
  mounted.view.destroy();
  mounted.container.remove();
};

const chooseFragment = (view: EditorView, from: number, to: number): void => {
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, from, to)));
};

const pressOn = (element: Element): MouseEvent => {
  let press: MouseEvent | null = null;
  element.addEventListener('click', (event) => {
    press = event as MouseEvent;
  });
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  if (press === null) throw new Error('the press was not reported');
  return press;
};

const OPEN_DISCUSSION = { openCounts: new Map([[BLOCK, 1]]), openMarkIds: new Set([DISCUSSION]) };

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

  it('keeps the request open while its words are being marked, so the thread stays on screen', () => {
    const mounted = mountEditor([paragraph('Una frase larga')]);
    chooseFragment(mounted.view, 5, 10);
    openPageEditorFragmentComments(mounted.view);

    createPageEditorCommentMarkCommand(DISCUSSION, { from: 5, to: 10 })(mounted.view.state, mounted.view.dispatch);

    expect(readPageEditorBlockRequest(mounted.view.state)?.kind).toBe('comments');

    closeEditor(mounted);
  });

  it('underlines the words only while their discussion is open', () => {
    const mounted = mountEditor([paragraph('Una frase larga')]);
    createPageEditorCommentMarkCommand(DISCUSSION, { from: 5, to: 10 })(mounted.view.state, mounted.view.dispatch);

    const underlinedComment = '.underline [data-comment-id], [data-comment-id] .underline, [data-comment-id].underline';
    expect(mounted.container.querySelector(underlinedComment)).toBeNull();
    mounted.view.dispatch(summarizePageEditorDiscussions(mounted.view.state, OPEN_DISCUSSION));
    expect(mounted.container.querySelector(underlinedComment)).not.toBeNull();

    closeEditor(mounted);
  });

  it('opens the discussion when the commented text is clicked', () => {
    const mounted = mountEditor([paragraph('Una frase larga')]);
    createPageEditorCommentMarkCommand(DISCUSSION, { from: 5, to: 10 })(mounted.view.state, mounted.view.dispatch);
    const commentedText = mounted.container.querySelector('[data-comment-id]');
    if (commentedText === null) throw new Error('the commented fragment was not drawn');

    mounted.view.someProp('handleClick', (answer) => answer(mounted.view, 6, pressOn(commentedText)));

    expect(readPageEditorBlockRequest(mounted.view.state)).toEqual({
      blockStart: 0,
      discussionId: DISCUSSION,
      kind: 'comments',
    });

    closeEditor(mounted);
  });
});
