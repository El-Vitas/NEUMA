import { Plugin as EditorPlugin, NodeSelection, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view';
import {
  PAGE_EDITOR_BLOCK_HANDLE_CLASS,
  PAGE_EDITOR_BLOCK_HANDLE_PLUGIN_KEY,
  PAGE_EDITOR_BLOCK_HANDLE_STYLE_CLASS,
  PAGE_EDITOR_BLOCK_PROBE_INSET_PX,
} from '../constants/pages.constants';

export const pageEditorBlockHandleKey = new PluginKey<number | null>(PAGE_EDITOR_BLOCK_HANDLE_PLUGIN_KEY);

const toBlockStart = (view: EditorView, position: number): number | null => {
  const resolved = view.state.doc.resolve(position);
  for (let depth = resolved.depth; depth > 0; depth -= 1) {
    const parentName = resolved.node(depth - 1).type.name;
    if (parentName === 'doc' || parentName === 'block_children') return resolved.before(depth);
  }
  return null;
};

export const findBlockPositionAtPointer = (view: EditorView, clientY: number): number | null => {
  const editorBox = view.dom.getBoundingClientRect();
  const found = view.posAtCoords({ left: editorBox.left + PAGE_EDITOR_BLOCK_PROBE_INSET_PX, top: clientY });
  return found === null ? null : toBlockStart(view, found.pos);
};

const updateHoveredBlock = (view: EditorView, position: number | null): void => {
  if (position === pageEditorBlockHandleKey.getState(view.state)) return;
  view.dispatch(view.state.tr.setMeta(pageEditorBlockHandleKey, position));
};

const selectBlockAt = (view: EditorView, position: number): void => {
  const selection = NodeSelection.create(view.state.doc, position);
  view.dispatch(view.state.tr.setSelection(selection));
  view.focus();
};

const createHandleElement = (view: EditorView, position: number, label: string): HTMLElement => {
  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = `${PAGE_EDITOR_BLOCK_HANDLE_CLASS} ${PAGE_EDITOR_BLOCK_HANDLE_STYLE_CLASS}`;
  handle.setAttribute('data-drag-handle', 'true');
  handle.tabIndex = -1;
  handle.setAttribute('aria-label', label);
  handle.textContent = '⠿';
  handle.addEventListener('mousedown', (event) => {
    event.preventDefault();
    selectBlockAt(view, position);
  });
  return handle;
};

export const createPageEditorBlockHandlePlugin = (selectBlockLabel: string): EditorPlugin<number | null> =>
  new EditorPlugin<number | null>({
    key: pageEditorBlockHandleKey,
    props: {
      decorations: (state) => {
        const position = pageEditorBlockHandleKey.getState(state);
        if (position === null || position === undefined) return DecorationSet.empty;
        return DecorationSet.create(state.doc, [
          Decoration.widget(position, (view) => createHandleElement(view, position, selectBlockLabel), {
            key: `page-editor-block-handle-${String(position)}`,
            side: -1,
          }),
        ]);
      },
    },
    view: (editorView) => {
      const pointerSurface = editorView.dom.parentElement ?? editorView.dom;
      const trackPointer = (event: MouseEvent) => {
        updateHoveredBlock(editorView, findBlockPositionAtPointer(editorView, event.clientY));
      };
      const clearPointer = () => {
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
        if (nextPosition === undefined) return previousPosition;
        return typeof nextPosition === 'number' ? nextPosition : null;
      },
      init: () => null,
    },
  });
