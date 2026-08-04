import type { PageEmbedProvider } from '@company-brain/shared';
import { pageAssetAttrsSchema, pageEmbedAttrsSchema } from '@company-brain/shared';
import { baseKeymap, setBlockType, toggleMark, wrapIn } from 'prosemirror-commands';
import { history, redo, undo } from 'prosemirror-history';
import { inputRules, textblockTypeInputRule, wrappingInputRule } from 'prosemirror-inputrules';
import { keymap } from 'prosemirror-keymap';
import type { Node as EditorNode, NodeType, Schema } from 'prosemirror-model';
import { splitListItem, wrapInList } from 'prosemirror-schema-list';
import type { Command, Plugin as EditorPlugin, EditorState } from 'prosemirror-state';
import type { PageAssetInsertCommandOptions, PageAssetNodeType, PageEditorCommand } from '../types/pages.types';

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
  bold: { labelKey: 'bold', run: toggleMark(schema.marks.strong) },
  blockquote: { labelKey: 'blockquote', run: wrapIn(schema.nodes.blockquote) },
  bulletList: { labelKey: 'bulletList', run: wrapInList(schema.nodes.bullet_list) },
  code: { labelKey: 'code', run: toggleMark(schema.marks.code) },
  codeBlock: { labelKey: 'codeBlock', run: setBlockType(schema.nodes.code_block) },
  heading: { labelKey: 'heading', run: setBlockType(schema.nodes.heading, { level: 2 }) },
  italic: { labelKey: 'italic', run: toggleMark(schema.marks.em) },
  orderedList: { labelKey: 'orderedList', run: wrapInList(schema.nodes.ordered_list) },
  redo: { labelKey: 'redo', run: redo },
  table: { labelKey: 'table', run: insertPageNode(createMinimalPageTableNode(schema)) },
  toggle: { labelKey: 'toggle', run: insertPageNode(createMinimalPageToggleNode(schema, toggleSummary)) },
  undo: { labelKey: 'undo', run: undo },
});

export const createPageEditorPlugins = (schema: Schema): readonly EditorPlugin[] => [
  history(),
  inputRules({
    rules: [
      textblockTypeInputRule(headingInputRule, schema.nodes.heading, (match) => ({ level: match[1]?.length ?? 1 })),
      wrappingInputRule(bulletListInputRule, schema.nodes.bullet_list),
      wrappingInputRule(orderedListInputRule, schema.nodes.ordered_list, (match) => ({ order: Number(match[1]) })),
    ],
  }),
  keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Shift-Mod-z': redo }),
  keymap(baseKeymap),
  keymap(Object.fromEntries([['Enter', splitListItem(schema.nodes.list_item)]])),
];
