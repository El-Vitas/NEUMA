import type { PageEmbedProvider } from '@company-brain/shared';
import {
  PAGE_CODE_LANGUAGES,
  pageAssetAttrsSchema,
  pageEmbedAttrsSchema,
  pageMentionAttrsSchema,
} from '@company-brain/shared';
import { baseKeymap, chainCommands, setBlockType, toggleMark, wrapIn } from 'prosemirror-commands';
import { gapCursor } from 'prosemirror-gapcursor';
import { history } from 'prosemirror-history';
import { InputRule, inputRules, textblockTypeInputRule, wrappingInputRule } from 'prosemirror-inputrules';
import { keymap } from 'prosemirror-keymap';
import type { Node as EditorNode, NodeType, Schema } from 'prosemirror-model';
import { wrapInList } from 'prosemirror-schema-list';
import type { Command, Plugin as EditorPlugin, EditorState, Transaction } from 'prosemirror-state';
import { Selection } from 'prosemirror-state';
import { columnResizing, tableEditing } from 'prosemirror-tables';
import { PAGE_EDITOR_TABLE_MINIMUM_CELL_WIDTH } from '../constants/pages.editor.blocks.constants';
import { PAGE_EDITOR_SHORTCUTS } from '../constants/pages.editor.shortcuts.constants';
import type {
  PageAssetInsertCommandOptions,
  PageAssetNodeType,
  PageEditorCommand,
  PageMentionInsertCommandOptions,
} from '../types/pages.types';
import { createPageEditorBlockCommentPlugin } from './pages.editor.block-comment.plugin.lib';
import { createPageEditorBlockDragPlugin } from './pages.editor.block-drag.plugin.lib';
import { createPageEditorBlockHandlePlugin } from './pages.editor.block-handle.lib';
import { createPageEditorBlockIdPlugin } from './pages.editor.block-id.lib';
import { createPageEditorBlockMenuPlugin } from './pages.editor.block-menu.lib';
import { createPageEditorColumnResizePlugin } from './pages.editor.column-resize.plugin.lib';
import { createPageEditorColumnCleanupPlugin } from './pages.editor.columns.plugin.lib';
import { openFoldedHeadingBeforeWriting, openFoldsReachingTheEnd } from './pages.editor.heading-fold.lib';
import { createPageEditorHeadingFoldPlugin } from './pages.editor.heading-fold.plugin.lib';
import { redoPageEditorStep, undoPageEditorStep } from './pages.editor.history.lib';
import { splitPageEditorListPoint } from './pages.editor.list.lib';
import { deletePageEditorBlockKeepingChildren, splitOutOfNestedBlock } from './pages.editor.nesting.lib';
import { createPageEditorPlaceholderPlugin } from './pages.editor.placeholder.plugin.lib';
import { createPageEditorShortcutBindings } from './pages.editor.shortcuts.lib';
import { createPageTable, goToNextPageTableCell, goToPreviousPageTableCell } from './pages.editor.table.lib';
import { PageTableView } from './pages.editor.table.view.lib';

const headingInputRule = /^(#{1,3})\s$/;
const bulletListInputRule = /^\s*([-+*])\s$/;
const orderedListInputRule = /^\s*(\d+)\.\s$/;
const taskListInputRule = /^\s*\[ ?\]\s$/;
const blockquoteInputRule = /^\s*>\s$/;
const dividerInputRule = /^---$/;
const codeBlockInputRule = /^```(\w+)?\s$/;

/** The language written after the backticks, kept only when it is one this version knows. */
const readWrittenCodeLanguage = (written: string | undefined): string | null =>
  PAGE_CODE_LANGUAGES.find((language) => language === written) ?? null;

/**
 * Leaves somewhere to go on writing under a line.
 *
 * A line holds nothing, so a page that ends on one has nowhere to put the next
 * word: the writing would have to be started from the button in the margin
 * rather than by simply typing.
 */
const leaveSomewhereToWriteUnder = (transaction: Transaction, schema: Schema): Transaction => {
  const afterTheLine = transaction.selection.to;
  if (afterTheLine < transaction.doc.content.size) return transaction;
  transaction.insert(afterTheLine, schema.nodes.paragraph.createChecked());
  return transaction.setSelection(Selection.near(transaction.doc.resolve(afterTheLine)));
};

const insertPageDivider =
  (schema: Schema): Command =>
  (state, dispatch) => {
    const divider = schema.nodes.divider;
    if (!canInsertPageNode(state, divider)) return false;
    if (dispatch === undefined) return true;
    dispatch(leaveSomewhereToWriteUnder(state.tr.replaceSelectionWith(divider.createChecked()), schema));
    return true;
  };

/**
 * Puts a table on the page and the writing in its first cell.
 *
 * A table is asked for in order to fill it, so the cursor starts where the
 * filling starts rather than after the whole grid.
 */
const insertPageTable =
  (schema: Schema): Command =>
  (state, dispatch) => {
    const table = createPageTable(schema);
    if (!canInsertPageNode(state, table.type)) return false;
    if (dispatch === undefined) return true;
    const firstCell = state.selection.anchor + 1;
    const transaction = state.tr.replaceSelectionWith(table);
    dispatch(transaction.setSelection(Selection.near(transaction.doc.resolve(firstCell))).scrollIntoView());
    return true;
  };

/** Draws a line where three dashes were written. */
const drawPageDivider = (schema: Schema): InputRule =>
  new InputRule(dividerInputRule, (state, _match, start, end) =>
    leaveSomewhereToWriteUnder(state.tr.replaceRangeWith(start, end, schema.nodes.divider.createChecked()), schema),
  );

const canInsertPageNode = (state: EditorState, nodeType: NodeType): boolean => {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    if ($from.node(depth).canReplaceWith($from.index(depth), $from.index(depth), nodeType)) return true;
  }
  return false;
};

const insertPageNode =
  (node: EditorNode): Command =>
  (state, dispatch) => {
    if (!canInsertPageNode(state, node.type)) return false;
    if (dispatch) dispatch(state.tr.replaceSelectionWith(node));
    return true;
  };

const createMinimalPageToggleNode = (schema: Schema, toggleSummary: string): EditorNode =>
  schema.nodes.toggle.createChecked({ summary: toggleSummary }, schema.nodes.paragraph.createChecked());

const buildPageAssetAttrs = (options: PageAssetInsertCommandOptions): Record<string, string> => {
  const attrs: Record<string, string> = { assetId: options.assetId };
  if (options.alt !== undefined) attrs.alt = options.alt;
  if (options.caption !== undefined) attrs.caption = options.caption;
  return attrs;
};

/**
 * Builds a ProseMirror command that inserts an `image` or `file` asset node
 * at the current selection.
 *
 * Returns a no-op command (reports `false`, never dispatches) when the
 * asset attrs fail the shared `pageAssetAttrsSchema` — the same contract
 * `serializePageEditorDocument` validates against at save time — so an
 * "insertable" asset can never fail to persist. Callers (such as an
 * attachment upload flow) build the command once the asset has a persisted
 * id, then run it through `runPageEditorCommand`.
 */
export const createPageAssetInsertCommand = (
  schema: Schema,
  nodeType: PageAssetNodeType,
  options: PageAssetInsertCommandOptions,
): Command => {
  const attrs = pageAssetAttrsSchema.safeParse(buildPageAssetAttrs(options));
  if (!attrs.success) return () => false;
  return insertPageNode(schema.nodes[nodeType].createChecked(attrs.data));
};

/**
 * Builds a ProseMirror command that inserts an `embed` node for an allowed
 * provider/url pair.
 *
 * Returns a no-op command (reports `false`, never dispatches) when the
 * provider/url pair fails the shared `pageEmbedAttrsSchema` — which already
 * enforces the url allowlist via `isAllowedPageEmbedUrl` internally — so
 * this is the single security boundary that keeps unvalidated urls out of
 * page content.
 */
export const createPageEmbedInsertCommand = (schema: Schema, provider: PageEmbedProvider, url: string): Command => {
  const attrs = pageEmbedAttrsSchema.safeParse({ provider, url });
  if (!attrs.success) return () => false;
  return insertPageNode(schema.nodes.embed.createChecked(attrs.data));
};

/**
 * Builds a ProseMirror command that inserts a `mention` node referencing
 * another page.
 *
 * Returns a no-op command (reports `false`, never dispatches) when the
 * `pageId`/`label`/`spaceId` triple fails the shared `pageMentionAttrsSchema`
 * — the same contract `serializePageEditorDocument` validates against at
 * save time.
 * Callers (the `@` mention picker) build the command once the requester has
 * chosen a candidate page, then run it through `runPageEditorCommand`.
 */
export const createPageMentionInsertCommand = (schema: Schema, options: PageMentionInsertCommandOptions): Command => {
  const attrs = pageMentionAttrsSchema.safeParse({
    label: options.label,
    pageId: options.pageId,
    spaceId: options.spaceId,
  });
  if (!attrs.success) return () => false;
  return insertPageNode(schema.nodes.mention.createChecked(attrs.data));
};

/**
 * Builds the full set of toolbar commands for the page editor.
 *
 * `toggleSummary` is the default `summary` attr used when inserting a new
 * toggle block — the caller owns that user-visible copy (see
 * `DEFAULT_PAGE_TOGGLE_SUMMARY` in `pages.editor.constants.ts`) so this
 * lib never hardcodes it.
 */
export const createPageEditorCommands = (
  schema: Schema,
  toggleSummary: string,
): Readonly<Record<string, PageEditorCommand>> => ({
  bold: { kind: 'mark', labelKey: 'bold', run: toggleMark(schema.marks.strong) },
  blockquote: { group: 'text', kind: 'block', labelKey: 'blockquote', run: wrapIn(schema.nodes.blockquote) },
  bulletList: { group: 'lists', kind: 'block', labelKey: 'bulletList', run: wrapInList(schema.nodes.bullet_list) },
  callout: { group: 'text', kind: 'block', labelKey: 'callout', run: wrapIn(schema.nodes.callout) },
  code: { kind: 'mark', labelKey: 'code', run: toggleMark(schema.marks.code) },
  codeBlock: { group: 'advanced', kind: 'block', labelKey: 'codeBlock', run: setBlockType(schema.nodes.code_block) },
  heading1: {
    group: 'text',
    kind: 'block',
    labelKey: 'heading1',
    run: setBlockType(schema.nodes.heading, { level: 1 }),
  },
  heading2: {
    group: 'text',
    kind: 'block',
    labelKey: 'heading2',
    run: setBlockType(schema.nodes.heading, { level: 2 }),
  },
  heading3: {
    group: 'text',
    kind: 'block',
    labelKey: 'heading3',
    run: setBlockType(schema.nodes.heading, { level: 3 }),
  },
  italic: { kind: 'mark', labelKey: 'italic', run: toggleMark(schema.marks.em) },
  divider: {
    group: 'advanced',
    kind: 'block',
    labelKey: 'divider',
    run: insertPageDivider(schema),
  },
  orderedList: { group: 'lists', kind: 'block', labelKey: 'orderedList', run: wrapInList(schema.nodes.ordered_list) },
  redo: { kind: 'history', labelKey: 'redo', run: redoPageEditorStep },
  taskList: { group: 'lists', kind: 'block', labelKey: 'taskList', run: wrapInList(schema.nodes.task_list) },
  table: {
    group: 'advanced',
    kind: 'block',
    labelKey: 'table',
    run: insertPageTable(schema),
  },
  toggle: {
    group: 'advanced',
    kind: 'block',
    labelKey: 'toggle',
    run: insertPageNode(createMinimalPageToggleNode(schema, toggleSummary)),
  },
  undo: { kind: 'history', labelKey: 'undo', run: undoPageEditorStep },
});

export const appendParagraphAtEnd: Command = (state, dispatch) => {
  const paragraphType = state.schema.nodes.paragraph;
  if (paragraphType === undefined) return false;
  if (dispatch === undefined) return true;

  const insertAt = state.doc.content.size;
  const transaction = openFoldsReachingTheEnd(state.tr, state.doc);
  transaction.insert(insertAt, paragraphType.create());
  transaction.setSelection(Selection.near(transaction.doc.resolve(insertAt + 1)));
  dispatch(transaction.scrollIntoView());
  return true;
};

/**
 * Breaks the line where the cursor is without starting another block.
 *
 * A code block already keeps its own newlines, so there it stands aside and
 * lets the usual behaviour answer.
 */
const breakTheLineWithoutLeavingTheBlock =
  (schema: Schema): Command =>
  (state, dispatch) => {
    const hardBreak = schema.nodes.hard_break;
    if (hardBreak === undefined) return false;
    if (state.selection.$from.parent.type.spec.code === true) return false;
    dispatch?.(state.tr.replaceSelectionWith(hardBreak.create()).scrollIntoView());
    return true;
  };

export const createPageEditorPlugins = (
  schema: Schema,
  selectBlockLabel: string,
  insertBlockLabel: string,
  resizeColumnLabel: string = selectBlockLabel,
  blockCommentsLabel: string = selectBlockLabel,
  writeHereLabel = '',
  foldHeadingLabel = '',
): readonly EditorPlugin[] => [
  history(),
  inputRules({
    rules: [
      textblockTypeInputRule(headingInputRule, schema.nodes.heading, (match) => ({ level: match[1]?.length ?? 1 })),
      wrappingInputRule(bulletListInputRule, schema.nodes.bullet_list),
      wrappingInputRule(orderedListInputRule, schema.nodes.ordered_list, (match) => ({ order: Number(match[1]) })),
      wrappingInputRule(taskListInputRule, schema.nodes.task_list),
      wrappingInputRule(blockquoteInputRule, schema.nodes.blockquote),
      drawPageDivider(schema),
      textblockTypeInputRule(codeBlockInputRule, schema.nodes.code_block, (match) => ({
        language: readWrittenCodeLanguage(match[1]),
      })),
    ],
  }),
  keymap({ 'Mod-y': redoPageEditorStep }),
  /**
   * Inside a table, Tab walks from cell to cell.
   *
   * It answers before the general Tab does, which nests one block under
   * another: a table is filled by walking it, and nesting a cell would be
   * asking for something nobody means while writing in a grid.
   */
  keymap(
    Object.fromEntries([
      ['Tab', goToNextPageTableCell],
      ['Shift-Tab', goToPreviousPageTableCell],
    ]),
  ),
  keymap(createPageEditorShortcutBindings(PAGE_EDITOR_SHORTCUTS)),
  keymap(
    Object.fromEntries([
      ['Enter', chainCommands(openFoldedHeadingBeforeWriting, splitOutOfNestedBlock)],
      ['Backspace', deletePageEditorBlockKeepingChildren],
      ['Delete', deletePageEditorBlockKeepingChildren],
    ]),
  ),
  keymap(Object.fromEntries([['Shift-Enter', breakTheLineWithoutLeavingTheBlock(schema)]])),
  /**
   * A list answers Enter before the general rule does.
   *
   * The other way round, the generic split attends first and the writing leaves
   * the list instead of gaining a point — which is what a reader sees as the
   * second bullet silently becoming a paragraph.
   */
  keymap(Object.fromEntries([['Enter', splitPageEditorListPoint]])),
  keymap(baseKeymap),
  /**
   * The cursor can stand beside a block that holds no writing.
   *
   * A table, a line or an image at the edge of a page would otherwise fence the
   * writing in: there is no paragraph to reach with an arrow, so the page ends
   * with nowhere to go on. The cursor lands in the gap instead, and whatever is
   * written there becomes a block of its own.
   */
  gapCursor(),
  createPageEditorBlockIdPlugin(),
  createPageEditorBlockHandlePlugin(selectBlockLabel, insertBlockLabel),
  createPageEditorBlockMenuPlugin(),
  createPageEditorBlockCommentPlugin(blockCommentsLabel),
  createPageEditorBlockDragPlugin(),
  createPageEditorColumnCleanupPlugin(),
  createPageEditorColumnResizePlugin(resizeColumnLabel),
  createPageEditorPlaceholderPlugin(writeHereLabel),
  createPageEditorHeadingFoldPlugin(foldHeadingLabel),
  /**
   * A table minds its own selection and the width of its columns. It comes last
   * so a cell answers the page's own rules first and the table only what is
   * left — dragging a column edge, selecting across cells.
   */
  columnResizing({ cellMinWidth: PAGE_EDITOR_TABLE_MINIMUM_CELL_WIDTH, View: PageTableView }),
  tableEditing(),
];
