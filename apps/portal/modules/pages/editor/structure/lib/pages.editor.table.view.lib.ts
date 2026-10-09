import type { Node as EditorNode } from 'prosemirror-model';
import { TableView } from 'prosemirror-tables';
import { PAGE_EDITOR_TABLE_SCROLL_STYLE_CLASS } from '../../blocks/constants/pages.editor.blocks.constants';

/** Wraps the table in its own scroll box so a wide table does not push the whole page sideways. */
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
