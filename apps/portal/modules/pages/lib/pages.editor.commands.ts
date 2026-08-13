import type { PageEmbedProvider } from '@company-brain/shared';
import { pageAssetAttrsSchema, pageEmbedAttrsSchema, pageMentionAttrsSchema } from '@company-brain/shared';
import { baseKeymap, setBlockType, toggleMark, wrapIn } from 'prosemirror-commands';
import { history } from 'prosemirror-history';
import { inputRules, textblockTypeInputRule, wrappingInputRule } from 'prosemirror-inputrules';
import { keymap } from 'prosemirror-keymap';
import type { Node as EditorNode, NodeType, Schema } from 'prosemirror-model';
import { splitListItem, wrapInList } from 'prosemirror-schema-list';
import type { Command, Plugin as EditorPlugin, EditorState } from 'prosemirror-state';
import { Selection } from 'prosemirror-state';
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
import { redoPageEditorStep, undoPageEditorStep } from './pages.editor.history.lib';
import { deletePageEditorBlockKeepingChildren, splitOutOfNestedBlock } from './pages.editor.nesting.lib';
import { createPageEditorPlaceholderPlugin } from './pages.editor.placeholder.plugin.lib';
import { createPageEditorShortcutBindings } from './pages.editor.shortcuts.lib';

const headingInputRule = /^(#{1,3})\s$/;
const bulletListInputRule = /^\s*([-+*])\s$/;
const orderedListInputRule = /^\s*(\d+)\.\s$/;

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

const createMinimalPageTableNode = (schema: Schema): EditorNode => {
  const cell = schema.nodes.table_cell.createChecked(null, schema.nodes.paragraph.createChecked());
  const row = schema.nodes.table_row.createChecked(null, cell);
  return schema.nodes.table.createChecked(null, row);
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
  heading: { group: 'text', kind: 'block', labelKey: 'heading', run: setBlockType(schema.nodes.heading, { level: 2 }) },
  italic: { kind: 'mark', labelKey: 'italic', run: toggleMark(schema.marks.em) },
  orderedList: { group: 'lists', kind: 'block', labelKey: 'orderedList', run: wrapInList(schema.nodes.ordered_list) },
  redo: { kind: 'history', labelKey: 'redo', run: redoPageEditorStep },
  taskList: { group: 'lists', kind: 'block', labelKey: 'taskList', run: wrapInList(schema.nodes.task_list) },
  table: {
    group: 'advanced',
    kind: 'block',
    labelKey: 'table',
    run: insertPageNode(createMinimalPageTableNode(schema)),
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
  const transaction = state.tr.insert(insertAt, paragraphType.create());
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
): readonly EditorPlugin[] => [
  history(),
  inputRules({
    rules: [
      textblockTypeInputRule(headingInputRule, schema.nodes.heading, (match) => ({ level: match[1]?.length ?? 1 })),
      wrappingInputRule(bulletListInputRule, schema.nodes.bullet_list),
      wrappingInputRule(orderedListInputRule, schema.nodes.ordered_list, (match) => ({ order: Number(match[1]) })),
    ],
  }),
  keymap({ 'Mod-y': redoPageEditorStep }),
  keymap(createPageEditorShortcutBindings(PAGE_EDITOR_SHORTCUTS)),
  keymap(
    Object.fromEntries([
      ['Enter', splitOutOfNestedBlock],
      ['Backspace', deletePageEditorBlockKeepingChildren],
      ['Delete', deletePageEditorBlockKeepingChildren],
    ]),
  ),
  keymap(Object.fromEntries([['Shift-Enter', breakTheLineWithoutLeavingTheBlock(schema)]])),
  keymap(baseKeymap),
  keymap(Object.fromEntries([['Enter', splitListItem(schema.nodes.list_item)]])),
  createPageEditorBlockIdPlugin(),
  createPageEditorBlockHandlePlugin(selectBlockLabel, insertBlockLabel),
  createPageEditorBlockMenuPlugin(),
  createPageEditorBlockCommentPlugin(blockCommentsLabel),
  createPageEditorBlockDragPlugin(),
  createPageEditorColumnCleanupPlugin(),
  createPageEditorColumnResizePlugin(resizeColumnLabel),
  createPageEditorPlaceholderPlugin(writeHereLabel),
];
