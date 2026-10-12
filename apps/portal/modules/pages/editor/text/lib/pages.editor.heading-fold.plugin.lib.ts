import type { Node as EditorNode } from 'prosemirror-model';
import { Plugin as EditorPlugin } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { Decoration, DecorationSet } from 'prosemirror-view';
import {
  PAGE_EDITOR_FOLDABLE_HEADING_STYLE_CLASS,
  PAGE_EDITOR_FOLDED_HEADING_MARK_STYLE_CLASS,
  PAGE_EDITOR_FOLDED_STYLE_CLASS,
  PAGE_EDITOR_HEADING_FOLD_END_STYLE_CLASS,
} from '../../blocks/constants/pages.editor.blocks.constants';
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

/** Folded content stays in the document and is only hidden; the state lives in the heading's `collapsed` attribute. */
export const createPageEditorHeadingFoldPlugin = (foldHeadingLabel: string): EditorPlugin =>
  new EditorPlugin({
    props: {
      decorations: (state) =>
        DecorationSet.create(state.doc, [...buildHeadingFoldDecorations(state.doc, foldHeadingLabel)]),
    },
  });
