import { Plugin as EditorPlugin, NodeSelection, Selection } from 'prosemirror-state';
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view';
import {
  PAGE_EDITOR_BLOCK_GUTTER_STYLE_CLASS,
  PAGE_EDITOR_BLOCK_HANDLE_CLASS,
  PAGE_EDITOR_BLOCK_HANDLE_STYLE_CLASS,
  PAGE_EDITOR_BLOCK_INSERT_CLASS,
  PAGE_EDITOR_BLOCK_INSERT_STYLE_CLASS,
  PAGE_EDITOR_COLUMN_DIVIDER_ATTRIBUTE,
  PAGE_EDITOR_GUTTER_REACH_PX,
} from '../constants/pages.editor.blocks.constants';
import type {
  PageEditorBlockRange,
  PageEditorDropPointer,
  PageEditorGutterLabels,
} from '../types/pages.editor.block-drag.types';
import { armPageEditorBlockDrag, isPageEditorBlockDragActive } from './pages.editor.block-drag.lib';
import { findPageEditorBlockAtPointer, offersGrabbableBlocks } from './pages.editor.block-target.lib';
import { pageEditorBlockHandleKey } from './pages.editor.plugin-keys.lib';

/**
 * The handle belongs to the innermost block under the pointer, read the same
 * way a drop target is read, so a block inside a column or a cell gets its own
 * pair of gutter buttons instead of the row's.
 */
export const findBlockPositionAtPointer = (view: EditorView, pointer: PageEditorDropPointer): number | null =>
  findPageEditorBlockAtPointer(view, pointer, offersGrabbableBlocks);

/**
 * Tells whether the pointer is close enough to a block to be asking for its
 * buttons: over the text, or in the margin beside it where those buttons are
 * drawn. The margin belongs to the page and not to the editor's own box, so
 * the reach is measured rather than inherited from the DOM.
 */
const isPointerWithinGutterReach = (view: EditorView, event: MouseEvent): boolean => {
  const box = view.dom.getBoundingClientRect();
  return (
    event.clientX >= box.left - PAGE_EDITOR_GUTTER_REACH_PX &&
    event.clientX <= box.right &&
    event.clientY >= box.top &&
    event.clientY <= box.bottom
  );
};

/**
 * The strip between two columns belongs to the divider that shares their
 * width: a block's buttons must not be drawn over it, or they would eat the
 * press meant to resize the row.
 */
const isPointerOnColumnDivider = (event: MouseEvent): boolean =>
  event.target instanceof Element && event.target.closest(`[${PAGE_EDITOR_COLUMN_DIVIDER_ATTRIBUTE}]`) !== null;

const updateHoveredBlock = (view: EditorView, position: number | null): void => {
  if (position === pageEditorBlockHandleKey.getState(view.state)) return;
  view.dispatch(view.state.tr.setMeta(pageEditorBlockHandleKey, position));
};

const holdsSingleBlock = (view: EditorView, range: PageEditorBlockRange): boolean =>
  view.state.doc.nodeAt(range.from)?.nodeSize === range.to - range.from;

const grabBlockAt = (view: EditorView, position: number): void => {
  const draggedBlocks = armPageEditorBlockDrag(view, position);
  if (draggedBlocks !== null && !holdsSingleBlock(view, draggedBlocks)) return;
  view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, position)));
  view.focus();
};

const insertParagraphAfter = (view: EditorView, position: number): void => {
  const paragraphType = view.state.schema.nodes.paragraph;
  const blockNode = view.state.doc.nodeAt(position);
  if (paragraphType === undefined || blockNode === null) return;
  const insertAt = position + blockNode.nodeSize;
  const transaction = view.state.tr.insert(insertAt, paragraphType.create());
  transaction.setSelection(Selection.near(transaction.doc.resolve(insertAt + 1)));
  view.dispatch(transaction.scrollIntoView());
  view.focus();
};

const createGutterButton = (parameters: {
  readonly className: string;
  readonly label: string;
  readonly marker: string;
  readonly onPress: () => void;
  readonly symbol: string;
}): HTMLElement => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = parameters.className;
  button.tabIndex = -1;
  button.contentEditable = 'false';
  button.setAttribute(parameters.marker, 'true');
  button.setAttribute('aria-label', parameters.label);
  button.textContent = parameters.symbol;
  button.addEventListener('mousedown', (event) => {
    event.preventDefault();
    parameters.onPress();
  });
  return button;
};

const createInsertElement = (view: EditorView, position: number, label: string): HTMLElement =>
  createGutterButton({
    className: `${PAGE_EDITOR_BLOCK_INSERT_CLASS} ${PAGE_EDITOR_BLOCK_INSERT_STYLE_CLASS}`,
    label,
    marker: 'data-block-insert',
    onPress: () => {
      insertParagraphAfter(view, position);
    },
    symbol: '+',
  });

const createHandleElement = (view: EditorView, position: number, label: string): HTMLElement =>
  createGutterButton({
    className: `${PAGE_EDITOR_BLOCK_HANDLE_CLASS} ${PAGE_EDITOR_BLOCK_HANDLE_STYLE_CLASS}`,
    label,
    marker: 'data-drag-handle',
    onPress: () => {
      grabBlockAt(view, position);
    },
    symbol: '⠿',
  });

/**
 * Holds the `+` and the grip of one block, parked just outside its left edge.
 *
 * They belong to the block itself and not to the page margin, so a block
 * sitting inside a column keeps its own pair right beside it.
 */
const createBlockGutter = (view: EditorView, position: number, labels: PageEditorGutterLabels): HTMLElement => {
  const gutter = document.createElement('div');
  gutter.className = PAGE_EDITOR_BLOCK_GUTTER_STYLE_CLASS;
  gutter.contentEditable = 'false';
  gutter.append(
    createInsertElement(view, position, labels.insertBlock),
    createHandleElement(view, position, labels.selectBlock),
  );
  return gutter;
};

export const createPageEditorBlockHandlePlugin = (
  selectBlockLabel: string,
  insertBlockLabel: string,
): EditorPlugin<number | null> =>
  new EditorPlugin<number | null>({
    key: pageEditorBlockHandleKey,
    props: {
      decorations: (state) => {
        const position = pageEditorBlockHandleKey.getState(state);
        if (position === null || position === undefined) return DecorationSet.empty;
        return DecorationSet.create(state.doc, [
          Decoration.widget(
            position,
            (view) =>
              createBlockGutter(view, position, { insertBlock: insertBlockLabel, selectBlock: selectBlockLabel }),
            { key: `page-editor-block-gutter-${String(position)}`, side: -1 },
          ),
        ]);
      },
    },
    view: (editorView) => {
      const pointerSurface = editorView.dom.ownerDocument;
      const trackPointer = (event: MouseEvent) => {
        if (isPageEditorBlockDragActive(editorView.state)) return;
        if (!isPointerWithinGutterReach(editorView, event) || isPointerOnColumnDivider(event)) {
          updateHoveredBlock(editorView, null);
          return;
        }
        updateHoveredBlock(editorView, findBlockPositionAtPointer(editorView, event));
      };
      const clearPointer = () => {
        if (isPageEditorBlockDragActive(editorView.state)) return;
        updateHoveredBlock(editorView, null);
      };
      pointerSurface.addEventListener('mousemove', trackPointer);
      pointerSurface.addEventListener('mouseleave', clearPointer);
      return {
        destroy: () => {
          pointerSurface.removeEventListener('mousemove', trackPointer);
          pointerSurface.removeEventListener('mouseleave', clearPointer);
        },
      };
    },
    state: {
      apply: (transaction, previousPosition) => {
        const nextPosition = transaction.getMeta(pageEditorBlockHandleKey);
        if (nextPosition === undefined) return transaction.docChanged ? null : previousPosition;
        return typeof nextPosition === 'number' ? nextPosition : null;
      },
      init: () => null,
    },
  });
