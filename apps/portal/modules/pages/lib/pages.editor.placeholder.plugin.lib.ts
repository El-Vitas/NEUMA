import { Plugin as EditorPlugin } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { PAGE_EDITOR_PLACEHOLDER_STYLE_CLASS } from '../constants/pages.editor.blocks.constants';

/**
 * Offers the invitation to write on the empty block the cursor is standing on,
 * and only there.
 *
 * Saying it on every empty block would turn a page full of room to breathe into
 * a page full of the same sentence repeated, so the hint follows the cursor and
 * disappears the moment something is written.
 */
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
