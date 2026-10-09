import type { Node as EditorNode } from 'prosemirror-model';
import { Plugin as EditorPlugin } from 'prosemirror-state';
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view';
import { pageEditorBlockDragKey } from '../../lib/pages.editor.plugin-keys.lib';
import {
  PAGE_EDITOR_DRAGGED_BLOCK_STYLE_CLASS,
  PAGE_EDITOR_DROP_COLUMN_LEFT_STYLE_CLASS,
  PAGE_EDITOR_DROP_COLUMN_RIGHT_STYLE_CLASS,
  PAGE_EDITOR_DROP_INDICATOR_CLASS,
  PAGE_EDITOR_DROP_INDICATOR_STYLE_CLASS,
  PAGE_EDITOR_IDLE_DRAG_STATE,
} from '../constants/pages.editor.blocks.constants';
import type {
  PageEditorBlockDragState,
  PageEditorBlockRange,
  PageEditorDragGhost,
  PageEditorDropPlacement,
} from '../types/pages.editor.block-drag.types';
import { createPageEditorDragGhost } from './pages.editor.block-drag.ghost.lib';
import {
  createPageEditorBlockDropCommand,
  findPageEditorDropPlacement,
  isPageEditorDropUseful,
  readPageEditorDragState,
  scrollPageWhileDragging,
  writePageEditorDragState,
} from './pages.editor.block-drag.lib';

const createDropIndicator = (): HTMLElement => {
  const indicator = document.createElement('div');
  indicator.className = `${PAGE_EDITOR_DROP_INDICATOR_CLASS} ${PAGE_EDITOR_DROP_INDICATOR_STYLE_CLASS}`;
  indicator.dataset.dropIndicator = 'true';
  indicator.contentEditable = 'false';
  return indicator;
};

const collectDraggedBlockDecorations = (document: EditorNode, range: PageEditorBlockRange): readonly Decoration[] => {
  const decorations: Decoration[] = [];
  for (let position = range.from; position < range.to; ) {
    const block = document.nodeAt(position);
    if (block === null) break;
    decorations.push(
      Decoration.node(position, position + block.nodeSize, { class: PAGE_EDITOR_DRAGGED_BLOCK_STYLE_CLASS }),
    );
    position += block.nodeSize;
  }
  return decorations;
};

const buildPlacementDecoration = (document: EditorNode, placement: PageEditorDropPlacement): Decoration | null => {
  if (placement.kind === 'between') {
    return Decoration.widget(placement.insertAt, createDropIndicator, { key: 'page-editor-drop-indicator', side: 0 });
  }
  const target = document.nodeAt(placement.blockStart);
  if (target === null) return null;
  return Decoration.node(placement.blockStart, placement.blockStart + target.nodeSize, {
    class:
      placement.side === 'left' ? PAGE_EDITOR_DROP_COLUMN_LEFT_STYLE_CLASS : PAGE_EDITOR_DROP_COLUMN_RIGHT_STYLE_CLASS,
  });
};

const buildDragDecorations = (document: EditorNode, dragState: PageEditorBlockDragState): DecorationSet => {
  if (dragState.range === null) return DecorationSet.empty;
  const dragged = collectDraggedBlockDecorations(document, dragState.range);
  const placement = dragState.placement === null ? null : buildPlacementDecoration(document, dragState.placement);
  return DecorationSet.create(document, placement === null ? [...dragged] : [...dragged, placement]);
};

const isPageEditorBlockDragState = (value: unknown): value is PageEditorBlockDragState =>
  typeof value === 'object' && value !== null && 'placement' in value && 'range' in value;

const isSamePlacement = (left: PageEditorDropPlacement | null, right: PageEditorDropPlacement | null): boolean => {
  if (left === null || right === null) return left === right;
  if (left.kind === 'between' && right.kind === 'between') return left.insertAt === right.insertAt;
  if (left.kind === 'column' && right.kind === 'column') {
    return left.blockStart === right.blockStart && left.side === right.side;
  }
  return false;
};

const trackBlockDrag = (view: EditorView, event: MouseEvent): void => {
  const dragState = readPageEditorDragState(view);
  if (dragState.range === null) return;
  if (event.buttons === 0) {
    writePageEditorDragState(view, PAGE_EDITOR_IDLE_DRAG_STATE);
    return;
  }
  event.preventDefault();
  scrollPageWhileDragging(view, event.clientY);

  const candidate = findPageEditorDropPlacement(view, event);
  const placement =
    candidate !== null && isPageEditorDropUseful({ copy: event.altKey, placement: candidate, range: dragState.range })
      ? candidate
      : null;
  if (!isSamePlacement(placement, dragState.placement)) {
    writePageEditorDragState(view, { placement, range: dragState.range });
  }
};

const dropDraggedBlocks = (view: EditorView, event: MouseEvent): void => {
  const { placement, range } = readPageEditorDragState(view);
  if (range === null) return;
  writePageEditorDragState(view, PAGE_EDITOR_IDLE_DRAG_STATE);
  if (placement === null) return;

  createPageEditorBlockDropCommand({ copy: event.altKey, placement, range })(view.state, view.dispatch);
  view.focus();
};

const cancelBlockDrag = (view: EditorView): void => {
  if (readPageEditorDragState(view).range === null) return;
  writePageEditorDragState(view, PAGE_EDITOR_IDLE_DRAG_STATE);
};

/**
 * Runs on pointer events, not native drag-and-drop: the handle calls `preventDefault` on mousedown to keep
 * the caret, which stops a native drag from starting in Chromium.
 */
export const createPageEditorBlockDragPlugin = (): EditorPlugin<PageEditorBlockDragState> =>
  new EditorPlugin<PageEditorBlockDragState>({
    key: pageEditorBlockDragKey,
    props: {
      decorations: (state) =>
        buildDragDecorations(state.doc, pageEditorBlockDragKey.getState(state) ?? PAGE_EDITOR_IDLE_DRAG_STATE),
    },
    state: {
      apply: (transaction, previousState) => {
        const meta: unknown = transaction.getMeta(pageEditorBlockDragKey);
        if (meta === undefined) return transaction.docChanged ? PAGE_EDITOR_IDLE_DRAG_STATE : previousState;
        return isPageEditorBlockDragState(meta) ? meta : PAGE_EDITOR_IDLE_DRAG_STATE;
      },
      init: () => PAGE_EDITOR_IDLE_DRAG_STATE,
    },
    view: (editorView) => {
      const trackedDocument = editorView.dom.ownerDocument;
      let ghost: PageEditorDragGhost | null = null;

      const dropGhost = (): void => {
        ghost?.remove();
        ghost = null;
      };
      const followPointerWithGhost = (event: MouseEvent): void => {
        const { range } = readPageEditorDragState(editorView);
        if (range === null) {
          dropGhost();
          return;
        }
        ghost ??= createPageEditorDragGhost(editorView, range);
        ghost?.moveTo(event.clientX, event.clientY);
      };

      const trackPointer = (event: MouseEvent) => {
        trackBlockDrag(editorView, event);
        followPointerWithGhost(event);
      };
      const finishDrag = (event: MouseEvent) => {
        dropDraggedBlocks(editorView, event);
        dropGhost();
      };
      const abortDrag = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        cancelBlockDrag(editorView);
        dropGhost();
      };
      trackedDocument.addEventListener('mousemove', trackPointer);
      trackedDocument.addEventListener('mouseup', finishDrag);
      trackedDocument.addEventListener('keydown', abortDrag);
      return {
        destroy: () => {
          dropGhost();
          trackedDocument.removeEventListener('mousemove', trackPointer);
          trackedDocument.removeEventListener('mouseup', finishDrag);
          trackedDocument.removeEventListener('keydown', abortDrag);
        },
      };
    },
  });
