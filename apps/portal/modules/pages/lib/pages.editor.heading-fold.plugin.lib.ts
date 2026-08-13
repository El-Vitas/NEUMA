import type { Node as EditorNode } from 'prosemirror-model';
import { Plugin as EditorPlugin } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { Decoration, DecorationSet } from 'prosemirror-view';
import {
  PAGE_EDITOR_FOLDABLE_HEADING_STYLE_CLASS,
  PAGE_EDITOR_FOLDED_HEADING_MARK_STYLE_CLASS,
  PAGE_EDITOR_FOLDED_STYLE_CLASS,
  PAGE_EDITOR_HEADING_FOLD_END_STYLE_CLASS,
} from '../constants/pages.editor.blocks.constants';
import { PAGE_EDITOR_HEADING_TYPE } from '../constants/pages.editor.heading.constants';
import { readPageEditorFoldedRanges, togglePageEditorHeadingFold } from './pages.editor.heading-fold.lib';

const createFoldButton = (view: EditorView, position: number, isFolded: boolean, label: string): HTMLElement => {
  const button = document.createElement('button');
  button.type = 'button';
  button.tabIndex = -1;
  button.contentEditable = 'false';
  button.className = isFolded
    ? `${PAGE_EDITOR_HEADING_FOLD_END_STYLE_CLASS} ${PAGE_EDITOR_FOLDED_HEADING_MARK_STYLE_CLASS}`
    : PAGE_EDITOR_HEADING_FOLD_END_STYLE_CLASS;
  button.dataset.headingFold = isFolded ? 'folded' : 'open';
  button.setAttribute('aria-expanded', String(!isFolded));
  button.setAttribute('aria-label', label);
  button.textContent = isFolded ? '▸' : '▾';
  button.addEventListener('mousedown', (event) => {
    event.preventDefault();
    togglePageEditorHeadingFold(position)(view.state, view.dispatch);
  });
  return button;
};

const buildHeadingFoldDecorations = (document: EditorNode, label: string): readonly Decoration[] => {
  const decorations: Decoration[] = [];

  document.forEach((node, offset) => {
    if (node.type.name !== PAGE_EDITOR_HEADING_TYPE) return;
    const isFolded = node.attrs.collapsed === true;
    decorations.push(
      Decoration.node(offset, offset + node.nodeSize, { class: PAGE_EDITOR_FOLDABLE_HEADING_STYLE_CLASS }),
      Decoration.widget(offset + node.nodeSize - 1, (view) => createFoldButton(view, offset, isFolded, label), {
        side: 1,
      }),
    );
  });

  for (const range of readPageEditorFoldedRanges(document)) {
    decorations.push(Decoration.node(range.from, range.to, { class: PAGE_EDITOR_FOLDED_STYLE_CLASS }));
  }

  return decorations;
};

/**
 * Lets a heading hold everything under it out of sight.
 *
 * What is folded stays in the page — it is only not drawn — so it still travels
 * with the document and is there for whoever opens the heading again. What the
 * button decides is written on the heading itself, which is why the page
 * reopens the way it was left.
 *
 * The button sits at the end of the heading rather than out in the margin: it
 * is the one place where it can be both pressed and read as belonging to that
 * heading, and where a folded heading can keep saying so.
 */
export const createPageEditorHeadingFoldPlugin = (foldHeadingLabel: string): EditorPlugin =>
  new EditorPlugin({
    props: {
      decorations: (state) =>
        DecorationSet.create(state.doc, [...buildHeadingFoldDecorations(state.doc, foldHeadingLabel)]),
    },
  });
