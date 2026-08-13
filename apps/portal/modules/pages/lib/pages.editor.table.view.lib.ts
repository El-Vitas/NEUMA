import type { Node as EditorNode } from 'prosemirror-model';
import { TableView } from 'prosemirror-tables';
import { PAGE_EDITOR_TABLE_SCROLL_STYLE_CLASS } from '../constants/pages.editor.blocks.constants';

/**
 * A table that is wider than the page scrolls inside itself.
 *
 * Left to itself a wide table pushes the whole page sideways, and every other
 * block on it drifts out of reach. The table is given a box of its own to
 * overflow into, so what is too wide travels only within the table.
 */
export class PageTableView extends TableView {
  constructor(node: EditorNode, cellMinWidth: number) {
    super(node, cellMinWidth);
    const scroll = document.createElement('div');
    scroll.className = PAGE_EDITOR_TABLE_SCROLL_STYLE_CLASS;
    scroll.dataset.tableScroll = 'true';
    this.dom.replaceChildren(scroll);
    scroll.append(this.table);
  }
}
