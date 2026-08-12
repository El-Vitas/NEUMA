import { Plugin as EditorPlugin, NodeSelection, PluginKey, Selection } from 'prosemirror-state';
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view';
import {
  PAGE_EDITOR_BLOCK_HANDLE_CLASS,
  PAGE_EDITOR_BLOCK_HANDLE_PLUGIN_KEY,
  PAGE_EDITOR_BLOCK_HANDLE_STYLE_CLASS,
  PAGE_EDITOR_BLOCK_INSERT_CLASS,
  PAGE_EDITOR_BLOCK_INSERT_STYLE_CLASS,
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
      selectBlockAt(view, position);
    },
    symbol: '⠿',
  });

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
          Decoration.widget(position, (view) => createInsertElement(view, position, insertBlockLabel), {
            key: `page-editor-block-insert-${String(position)}`,
            side: -2,
          }),
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
