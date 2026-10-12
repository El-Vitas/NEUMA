import { Plugin as EditorPlugin, NodeSelection, Selection } from 'prosemirror-state';
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view';
import { pageEditorBlockHandleKey } from '../../lib/pages.editor.plugin-keys.lib';
import {
  PAGE_EDITOR_BLOCK_GUTTER_STYLE_CLASS,
  PAGE_EDITOR_BLOCK_HANDLE_CLASS,
  PAGE_EDITOR_BLOCK_HANDLE_STYLE_CLASS,
  PAGE_EDITOR_BLOCK_INSERT_CLASS,
  PAGE_EDITOR_BLOCK_INSERT_STYLE_CLASS,
  PAGE_EDITOR_COLUMN_DIVIDER_ATTRIBUTE,
  PAGE_EDITOR_GRIP_CLICK_TOLERANCE_PX,
  PAGE_EDITOR_GUTTER_BLOCK_GAP_PX,
  PAGE_EDITOR_GUTTER_BUTTON_MAX_PX,
  PAGE_EDITOR_GUTTER_BUTTON_MIN_PX,
  PAGE_EDITOR_GUTTER_BUTTON_RATIO,
  PAGE_EDITOR_GUTTER_REACH_PX,
} from '../constants/pages.editor.blocks.constants';
import type {
  PageEditorBlockRange,
  PageEditorDropPointer,
  PageEditorGutterLabels,
} from '../types/pages.editor.block-drag.types';
import { armPageEditorBlockDrag, isPageEditorBlockDragActive } from './pages.editor.block-drag.lib';
import { openPageEditorBlockRequest } from './pages.editor.block-menu.lib';
import {
  findPageEditorBlockAtPointer,
  findPageEditorBlockOnPointerRow,
  offersGrabbableBlocks,
} from './pages.editor.block-target.lib';

/** Innermost block, so a block inside a column or cell gets its own buttons instead of the row's. */
export const findBlockPositionAtPointer = (view: EditorView, pointer: PageEditorDropPointer): number | null =>
  findPageEditorBlockAtPointer(view, pointer, offersGrabbableBlocks) ??
  findPageEditorBlockOnPointerRow(view, pointer.clientY);

/** The margin belongs to the page, not the editor's box, so the reach is measured, not inherited. */
const isPointerWithinGutterReach = (view: EditorView, event: MouseEvent): boolean => {
  const box = view.dom.getBoundingClientRect();
  return (
    event.clientX >= box.left - PAGE_EDITOR_GUTTER_REACH_PX &&
    event.clientX <= box.right + PAGE_EDITOR_GUTTER_REACH_PX &&
    event.clientY >= box.top &&
    event.clientY <= box.bottom
  );
};

/** Buttons must not cover the divider, or they would swallow the press meant to resize the row. */
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

const hasPointerStayedPut = (origin: MouseEvent, release: MouseEvent): boolean =>
  Math.abs(release.clientX - origin.clientX) <= PAGE_EDITOR_GRIP_CLICK_TOLERANCE_PX &&
  Math.abs(release.clientY - origin.clientY) <= PAGE_EDITOR_GRIP_CLICK_TOLERANCE_PX;

/** A click on the grip opens the actions; dragging is the same gesture carried further. */
const askForBlockActionsOnClick = (view: EditorView, grip: HTMLElement, position: number): void => {
  grip.addEventListener('mousedown', (origin) => {
    const releaseSurface = grip.ownerDocument;
    const openIfUnmoved = (release: MouseEvent): void => {
      releaseSurface.removeEventListener('mouseup', openIfUnmoved);
      if (hasPointerStayedPut(origin, release)) openPageEditorBlockRequest(view, position, 'actions');
    };
    releaseSurface.addEventListener('mouseup', openIfUnmoved);
  });
};

const createHandleElement = (view: EditorView, position: number, label: string): HTMLElement => {
  const grip = createGutterButton({
    className: `${PAGE_EDITOR_BLOCK_HANDLE_CLASS} ${PAGE_EDITOR_BLOCK_HANDLE_STYLE_CLASS}`,
    label,
    marker: 'data-drag-handle',
    onPress: () => {
      grabBlockAt(view, position);
    },
    symbol: '⠿',
  });
  askForBlockActionsOnClick(view, grip, position);
  return grip;
};

const clampGutterButtonSize = (size: number): number =>
  Math.min(Math.max(size, PAGE_EDITOR_GUTTER_BUTTON_MIN_PX), PAGE_EDITOR_GUTTER_BUTTON_MAX_PX);

/** Follows the block's own line; the room beside the block is the page margin, which the editor cannot measure. */
const measureGutterButton = (blockStyle: CSSStyleDeclaration, blockHeight: number): number => {
  const lineHeight = Number.parseFloat(blockStyle.lineHeight);
  const line = Number.isFinite(lineHeight) ? lineHeight : blockHeight;
  return clampGutterButtonSize(line * PAGE_EDITOR_GUTTER_BUTTON_RATIO);
};

/** Placed against the block, not floated: a float lands wherever the flow is, riding high beside tall headings. */
const standGutterBesideBlock = (view: EditorView, gutter: HTMLElement, position: number): void => {
  const blockDom = view.nodeDOM(position);
  if (!(blockDom instanceof HTMLElement)) return;
  // The editor is not positioned, so it and the gutter share an ancestor; measuring elsewhere offsets the buttons.
  const origin = blockDom.offsetParent instanceof HTMLElement ? blockDom.offsetParent : view.dom;
  const originRect = origin.getBoundingClientRect();
  const originLeft = originRect.left + origin.clientLeft;
  const originTop = originRect.top + origin.clientTop;
  const blockRect = blockDom.getBoundingClientRect();
  const buttonSize = measureGutterButton(globalThis.getComputedStyle(blockDom), blockRect.height);

  gutter.style.left = `${String(blockRect.left - originLeft - PAGE_EDITOR_GUTTER_BLOCK_GAP_PX)}px`;
  gutter.style.top = `${String(blockRect.top - originTop)}px`;
  gutter.style.height = `${String(blockRect.height)}px`;
  for (const button of gutter.children) {
    if (!(button instanceof HTMLElement)) continue;
    const size = buttonSize;
    button.style.width = `${String(Math.round(size))}px`;
    button.style.height = `${String(Math.round(size))}px`;
    button.style.fontSize = `${String(Math.round(size * PAGE_EDITOR_GUTTER_BUTTON_RATIO))}px`;
    button.style.lineHeight = '1';
  }
};

const createBlockGutter = (view: EditorView, position: number, labels: PageEditorGutterLabels): HTMLElement => {
  const gutter = document.createElement('div');
  gutter.className = PAGE_EDITOR_BLOCK_GUTTER_STYLE_CLASS;
  gutter.contentEditable = 'false';
  gutter.append(
    createInsertElement(view, position, labels.insertBlock),
    createHandleElement(view, position, labels.selectBlock),
  );
  standGutterBesideBlock(view, gutter, position);
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
              createBlockGutter(view, position, {
                insertBlock: insertBlockLabel,
                selectBlock: selectBlockLabel,
              }),
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
