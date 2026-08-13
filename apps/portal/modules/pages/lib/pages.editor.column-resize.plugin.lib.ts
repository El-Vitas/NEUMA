import type { Node as EditorNode } from 'prosemirror-model';
import { Plugin as EditorPlugin } from 'prosemirror-state';
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view';
import {
  PAGE_EDITOR_COLUMN_DIVIDER_ATTRIBUTE,
  PAGE_EDITOR_COLUMN_DIVIDER_BAR_STYLE_CLASS,
  PAGE_EDITOR_COLUMN_DIVIDER_STYLE_CLASS,
  PAGE_EDITOR_COLUMN_ROW_TYPE,
} from '../constants/pages.editor.blocks.constants';
import type { PageEditorColumnRow } from '../types/pages.editor.block-drag.types';
import { readPageEditorColumnWidths, resizePageEditorColumns } from './pages.editor.column-resize.lib';

const readColumnWidths = (row: PageEditorColumnRow): readonly number[] =>
  readPageEditorColumnWidths(row.columns.map((column) => column.attrs.width));

const writeColumnWidths = (view: EditorView, row: PageEditorColumnRow, widths: readonly number[]): void => {
  const transaction = view.state.tr;
  let columnStart = row.start + 1;
  row.columns.forEach((column, index) => {
    transaction.setNodeAttribute(columnStart, 'width', widths[index] ?? null);
    columnStart += column.nodeSize;
  });
  view.dispatch(transaction.setMeta('addToHistory', false));
};

const findRowAt = (view: EditorView, rowStart: number): PageEditorColumnRow | null => {
  const row = view.state.doc.nodeAt(rowStart);
  if (row?.type.name !== PAGE_EDITOR_COLUMN_ROW_TYPE) return null;
  return { columns: row.children, start: rowStart };
};

const dragDivider = (parameters: {
  readonly boundaryIndex: number;
  readonly rowStart: number;
  readonly view: EditorView;
}): void => {
  const { boundaryIndex, rowStart, view } = parameters;
  const rowDom = view.nodeDOM(rowStart);
  if (!(rowDom instanceof HTMLElement)) return;
  const rowRect = rowDom.getBoundingClientRect();
  const trackedDocument = view.dom.ownerDocument;

  const resize = (event: MouseEvent): void => {
    const row = findRowAt(view, rowStart);
    if (row === null) return;
    event.preventDefault();
    const pointerRatio = (event.clientX - rowRect.left) / rowRect.width;
    writeColumnWidths(
      view,
      row,
      resizePageEditorColumns({ boundaryIndex, pointerRatio, widths: readColumnWidths(row) }),
    );
  };
  const stop = (): void => {
    trackedDocument.removeEventListener('mousemove', resize);
    trackedDocument.removeEventListener('mouseup', stop);
  };
  trackedDocument.addEventListener('mousemove', resize);
  trackedDocument.addEventListener('mouseup', stop);
};

const createDivider = (parameters: {
  readonly boundaryIndex: number;
  readonly label: string;
  readonly rowStart: number;
  readonly view: EditorView;
}): HTMLElement => {
  const divider = document.createElement('div');
  const bar = document.createElement('span');
  bar.className = PAGE_EDITOR_COLUMN_DIVIDER_BAR_STYLE_CLASS;
  divider.append(bar);
  divider.className = PAGE_EDITOR_COLUMN_DIVIDER_STYLE_CLASS;
  divider.setAttribute(PAGE_EDITOR_COLUMN_DIVIDER_ATTRIBUTE, 'true');
  divider.setAttribute('aria-label', parameters.label);
  divider.contentEditable = 'false';
  divider.addEventListener('mousedown', (event) => {
    event.preventDefault();
    dragDivider({ boundaryIndex: parameters.boundaryIndex, rowStart: parameters.rowStart, view: parameters.view });
  });
  return divider;
};

const collectDividerDecorations = (document: EditorNode, label: string): readonly Decoration[] => {
  const decorations: Decoration[] = [];
  document.descendants((node, rowStart) => {
    if (node.type.name !== PAGE_EDITOR_COLUMN_ROW_TYPE) return;
    let columnStart = rowStart + 1;
    node.children.forEach((column, index) => {
      columnStart += column.nodeSize;
      if (index === node.childCount - 1) return;
      decorations.push(
        Decoration.widget(columnStart, (view) => createDivider({ boundaryIndex: index, label, rowStart, view }), {
          key: `page-editor-column-divider-${String(rowStart)}-${String(index)}`,
          side: 0,
        }),
      );
    });
  });
  return decorations;
};

/**
 * Puts a grip between two columns so the width of a row can be shared by hand.
 *
 * The grip takes the whole gap between the columns, while what is drawn inside
 * it stays a thin line: a person aims at the space between columns, not at a
 * four pixel target.
 *
 * Widths are written without touching the undo history: resizing is a way of
 * looking at the page, not an edit of what it says.
 */
export const createPageEditorColumnResizePlugin = (dividerLabel: string): EditorPlugin =>
  new EditorPlugin({
    props: {
      decorations: (state) => {
        const dividers = collectDividerDecorations(state.doc, dividerLabel);
        return dividers.length === 0 ? DecorationSet.empty : DecorationSet.create(state.doc, [...dividers]);
      },
    },
  });
