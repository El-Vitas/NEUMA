import { Plugin as EditorPlugin } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { PAGE_EDITOR_PLACEHOLDER_STYLE_CLASS } from '../blocks/constants/pages.editor.blocks.constants';

/** Shown only on the empty block under the cursor, so a page of empty blocks does not repeat the hint. */
export const createPageEditorPlaceholderPlugin = (placeholder: string): EditorPlugin =>
  new EditorPlugin({
    props: {
      decorations: (state) => {
        if (placeholder === '') return DecorationSet.empty;
        const { $from, empty } = state.selection;
        const block = $from.parent;
        if (!empty || !block.isTextblock || block.content.size > 0 || block.type.spec.code === true) {
          return DecorationSet.empty;
        }
        const start = $from.before();
        return DecorationSet.create(state.doc, [
          Decoration.node(start, start + block.nodeSize, {
            class: PAGE_EDITOR_PLACEHOLDER_STYLE_CLASS,
            'data-placeholder': placeholder,
          }),
        ]);
      },
    },
  });
