import { type EditorState, Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { PAGE_EDITOR_CONTENTS_TYPE } from '../constants/pages.editor.blocks.constants';
import {
  PAGE_EDITOR_CONTENTS_PLUGIN_KEY,
  PAGE_EDITOR_HEADING_ATTRIBUTE,
} from '../constants/pages.editor.contents.constants';
import { PAGE_EDITOR_HEADING_TYPE } from '../constants/pages.editor.heading.constants';
import { nameTheHeadings, readPageHeadings } from './pages.editor.contents.lib';

const markEveryIndex = (state: EditorState): DecorationSet => {
  const named = nameTheHeadings(readPageHeadings(state.doc));
  const marked: Decoration[] = [];
  let heading = 0;
  state.doc.descendants((node, position) => {
    if (node.type.name === PAGE_EDITOR_HEADING_TYPE) {
      marked.push(
        Decoration.node(position, position + node.nodeSize, { [PAGE_EDITOR_HEADING_ATTRIBUTE]: String(heading) }),
      );
      heading += 1;
      return false;
    }
    if (node.type.name !== PAGE_EDITOR_CONTENTS_TYPE) return true;
    marked.push(Decoration.node(position, position + node.nodeSize, {}, { headings: named }));
    return false;
  });
  return DecorationSet.create(state.doc, marked);
};

/**
 * Tells an index when the page it lists has changed.
 *
 * A block is only asked to redraw itself when its own writing changes, and an
 * index has no writing of its own: it would be drawn once and go stale the
 * moment somebody typed a heading. So each one is marked with what the headings
 * of the page come to, and a mark that changes is what asks it to be redrawn —
 * which also means writing a paragraph leaves it exactly as it was.
 *
 * The headings are marked too, in the order they are written, because the index
 * kept at the side of the page is drawn outside the writing and has no other way
 * of knowing which heading is the one being read.
 */
export const createPageEditorContentsPlugin = (): Plugin =>
  new Plugin({
    key: new PluginKey(PAGE_EDITOR_CONTENTS_PLUGIN_KEY),
    props: { decorations: markEveryIndex },
  });
