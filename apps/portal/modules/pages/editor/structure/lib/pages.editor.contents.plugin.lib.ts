import { type EditorState, Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { PAGE_EDITOR_CONTENTS_TYPE } from '../../blocks/constants/pages.editor.blocks.constants';
import { PAGE_EDITOR_HEADING_TYPE } from '../../text/constants/pages.editor.heading.constants';
import {
  PAGE_EDITOR_CONTENTS_PLUGIN_KEY,
  PAGE_EDITOR_HEADING_ATTRIBUTE,
} from '../constants/pages.editor.contents.constants';
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
 * A node view only redraws when its own content changes, and an index has none, so each index and heading is
 * decorated with the heading signature: a changed decoration forces the redraw.
 */
export const createPageEditorContentsPlugin = (): Plugin =>
  new Plugin({
    key: new PluginKey(PAGE_EDITOR_CONTENTS_PLUGIN_KEY),
    props: { decorations: markEveryIndex },
  });
