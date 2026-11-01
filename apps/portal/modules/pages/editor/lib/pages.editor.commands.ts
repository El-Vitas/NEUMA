import type { PageEmbedProvider } from '@neuma/shared';
import {
  PAGE_CODE_LANGUAGES,
  PAGE_DIAGRAM_LANGUAGE,
  PAGE_FORMULA_LANGUAGE,
  pageAssetAttrsSchema,
  pageEmbedAttrsSchema,
  pageFileAttrsSchema,
  pageImageAttrsSchema,
  pageMediaAttrsSchema,
  pageMentionAttrsSchema,
} from '@neuma/shared';
import { baseKeymap, chainCommands, setBlockType, toggleMark, wrapIn } from 'prosemirror-commands';
import { gapCursor } from 'prosemirror-gapcursor';
import { history } from 'prosemirror-history';
import { InputRule, inputRules, undoInputRule, wrappingInputRule } from 'prosemirror-inputrules';
import { keymap } from 'prosemirror-keymap';
import type { Attrs, Node as EditorNode, MarkType, NodeType, Schema } from 'prosemirror-model';
import { wrapInList } from 'prosemirror-schema-list';
import type { Command, Plugin as EditorPlugin } from 'prosemirror-state';
import { Selection } from 'prosemirror-state';
import { columnResizing, tableEditing } from 'prosemirror-tables';
import type {
  PageAssetInsertCommandOptions,
  PageAssetNodeType,
  PageEditorCommand,
  PageMentionInsertCommandOptions,
} from '../../types/pages.types';
import { PAGE_EDITOR_TABLE_MINIMUM_CELL_WIDTH } from '../blocks/constants/pages.editor.blocks.constants';
import { createPageEditorBlockCommentPlugin } from '../blocks/lib/pages.editor.block-comment.plugin.lib';
import { createPageEditorBlockDragPlugin } from '../blocks/lib/pages.editor.block-drag.plugin.lib';
import { createPageEditorBlockHandlePlugin } from '../blocks/lib/pages.editor.block-handle.lib';
import { createPageEditorBlockIdPlugin } from '../blocks/lib/pages.editor.block-id.lib';
import { createPageEditorBlockMenuPlugin } from '../blocks/lib/pages.editor.block-menu.lib';
import { createPageEditorRestrictedBlocksPlugin } from '../blocks/lib/pages.editor.block-restricted.plugin.lib';
import { createPageEditorColumnResizePlugin } from '../blocks/lib/pages.editor.column-resize.plugin.lib';
import { readCarriedAttrs } from '../blocks/lib/pages.editor.convert.lib';
import { deletePageEditorBlockKeepingChildren, splitOutOfNestedBlock } from '../blocks/lib/pages.editor.nesting.lib';
import {
  PAGE_EDITOR_BLOCKQUOTE_INPUT_PATTERN,
  PAGE_EDITOR_BOLD_INPUT_PATTERN,
  PAGE_EDITOR_BULLET_LIST_INPUT_PATTERN,
  PAGE_EDITOR_CODE_BLOCK_INPUT_PATTERN,
  PAGE_EDITOR_CODE_INPUT_PATTERN,
  PAGE_EDITOR_DIVIDER_INPUT_PATTERN,
  PAGE_EDITOR_HEADING_INPUT_PATTERN,
  PAGE_EDITOR_ITALIC_INPUT_PATTERN,
  PAGE_EDITOR_LINK_INPUT_PATTERN,
  PAGE_EDITOR_ORDERED_LIST_INPUT_PATTERN,
  PAGE_EDITOR_STRIKE_INPUT_PATTERN,
  PAGE_EDITOR_TASK_LIST_INPUT_PATTERN,
} from '../constants/pages.editor.input-rules.constants';
import { askForPageImage } from '../media/lib/pages.editor.image.lib';
import { PAGE_EDITOR_SHORTCUTS } from '../menus/constants/pages.editor.shortcuts.constants';
import { createPageEditorFindPlugin } from '../menus/lib/pages.editor.find.plugin.lib';
import { createPageEditorShortcutBindings } from '../menus/lib/pages.editor.shortcuts.lib';
import { askForACollection, askForACollectionAlreadyWritten } from '../structure/lib/pages.editor.collection.lib';
import { createPageEditorContentsPlugin } from '../structure/lib/pages.editor.contents.plugin.lib';
import { splitPageEditorListPoint } from '../structure/lib/pages.editor.list.lib';
import { askForAPageAlreadyWritten, askForPageChild } from '../structure/lib/pages.editor.subpage.lib';
import {
  createPageTable,
  goToNextPageTableCell,
  goToPreviousPageTableCell,
} from '../structure/lib/pages.editor.table.lib';
import { askForEmoji } from '../text/lib/pages.editor.emoji.lib';
import { openFoldedHeadingBeforeWriting, openFoldsReachingTheEnd } from '../text/lib/pages.editor.heading-fold.lib';
import { createPageEditorHeadingFoldPlugin } from '../text/lib/pages.editor.heading-fold.plugin.lib';
import { askForTheLinkField } from '../text/lib/pages.editor.link.lib';
import { askForAPerson } from '../text/lib/pages.editor.person.lib';
import { createPageEditorColumnCleanupPlugin } from './pages.editor.columns.plugin.lib';
import { redoPageEditorStep, undoPageEditorStep } from './pages.editor.history.lib';
import { canInsertPageNode, insertPageNode } from './pages.editor.insert.lib';
import { createPageEditorPlaceholderPlugin } from './pages.editor.placeholder.plugin.lib';
import { leaveSomewhereToWriteUnder } from './pages.editor.write-under.lib';

const readWrittenCodeLanguage = (written: string | undefined): string | null =>
  PAGE_CODE_LANGUAGES.find((language) => language === written) ?? null;

const insertPageDivider =
  (schema: Schema): Command =>
  (state, dispatch) => {
    const divider = schema.nodes.divider;
    if (!canInsertPageNode(state, divider)) return false;
    if (dispatch === undefined) return true;
    dispatch(leaveSomewhereToWriteUnder(state.tr.replaceSelectionWith(divider.createChecked()), schema));
    return true;
  };

/** Inserts a table with the cursor in its first cell. */
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

const drawPageDivider = (schema: Schema): InputRule =>
  new InputRule(PAGE_EDITOR_DIVIDER_INPUT_PATTERN, (state, _match, start, end) =>
    leaveSomewhereToWriteUnder(state.tr.replaceRangeWith(start, end, schema.nodes.divider.createChecked()), schema),
  );

const writePageLink = (schema: Schema): InputRule =>
  new InputRule(PAGE_EDITOR_LINK_INPUT_PATTERN, (state, match, start, end) => {
    const [, label, url] = match;
    if (label === undefined || url === undefined) return null;
    return state.tr.replaceRangeWith(start, end, schema.text(label, [schema.marks.link.create({ href: url })]));
  });

/** Keeps the block's identity (id, colours) across the type change, as a manual conversion does. */
const turnTheLineInto = (pattern: RegExp, type: NodeType, readAttrs: (match: RegExpMatchArray) => Attrs): InputRule =>
  new InputRule(pattern, (state, match, start, end) => {
    const written = state.doc.resolve(start);
    if (!written.node(-1).canReplaceWith(written.index(-1), written.indexAfter(-1), type)) return null;
    const kept = { ...readCarriedAttrs(written.parent.attrs), ...readAttrs(match) };
    return state.tr.delete(start, end).setBlockType(start, start, type, kept);
  });

/** Replaces the markers with the marked text (`**so**` becomes bold `so`); never inside code blocks. */
const writeInlineMark = (pattern: RegExp, mark: MarkType): InputRule =>
  new InputRule(pattern, (state, match, start, end) => {
    const written = match[1];
    if (written === undefined) return null;
    if (state.doc.resolve(start).parent.type.spec.code === true) return null;
    return state.tr.replaceWith(start, end, state.schema.text(written, [mark.create()])).removeStoredMark(mark);
  });

const createMinimalPageToggleNode = (schema: Schema, toggleSummary: string): EditorNode =>
  schema.nodes.toggle.createChecked({ summary: toggleSummary }, schema.nodes.paragraph.createChecked());

const createMinimalPageButtonNode = (schema: Schema, label: string): EditorNode =>
  schema.nodes.button.createChecked({ label }, schema.nodes.paragraph.createChecked());

const buildPageAssetAttrs = (options: PageAssetInsertCommandOptions): Record<string, number | string> => {
  const attrs: Record<string, number | string> = { assetId: options.assetId };
  if (options.alt !== undefined) attrs.alt = options.alt;
  if (options.caption !== undefined) attrs.caption = options.caption;
  if (options.mimeType !== undefined) attrs.mimeType = options.mimeType;
  if (options.size !== undefined) attrs.size = options.size;
  return attrs;
};

const readPageAssetAttrsShape = (nodeType: PageAssetNodeType) => {
  switch (nodeType) {
    case 'file':
      return pageFileAttrsSchema;
    case 'image':
      return pageImageAttrsSchema;
    case 'audio':
    case 'video':
      return pageMediaAttrsSchema;
    default:
      return pageAssetAttrsSchema;
  }
};

/**
 * Returns a command that reports `false` when the attrs fail the schema used at save time,
 * so an insertable asset can never fail to persist.
 */
export const createPageAssetInsertCommand = (
  schema: Schema,
  nodeType: PageAssetNodeType,
  options: PageAssetInsertCommandOptions,
): Command => {
  const shape = readPageAssetAttrsShape(nodeType);
  const attrs = shape.safeParse(buildPageAssetAttrs(options));
  if (!attrs.success) return () => false;
  return insertPageNode(schema.nodes[nodeType].createChecked(attrs.data));
};

/** The schema's URL allowlist is the only gate keeping unvalidated URLs out of page content. */
export const createPageEmbedInsertCommand = (schema: Schema, provider: PageEmbedProvider, url: string): Command => {
  const attrs = pageEmbedAttrsSchema.safeParse({ provider, url });
  if (!attrs.success) return () => false;
  return insertPageNode(schema.nodes.embed.createChecked(attrs.data));
};

/** Returns a command that reports `false` when the attrs fail the schema used at save time. */
export const createPageMentionInsertCommand = (schema: Schema, options: PageMentionInsertCommandOptions): Command => {
  const attrs = pageMentionAttrsSchema.safeParse({
    label: options.label,
    pageId: options.pageId,
    spaceId: options.spaceId,
  });
  if (!attrs.success) return () => false;
  return insertPageNode(schema.nodes.mention.createChecked(attrs.data));
};

/** `toggleSummary` is caller-owned copy (see `DEFAULT_PAGE_TOGGLE_SUMMARY`), so this lib never hardcodes it. */
export const createPageEditorCommands = (
  schema: Schema,
  toggleSummary: string,
  buttonLabel: string = toggleSummary,
): Readonly<Record<string, PageEditorCommand>> => ({
  button: {
    group: 'advanced',
    kind: 'block',
    labelKey: 'button',
    run: insertPageNode(createMinimalPageButtonNode(schema, buttonLabel)),
  },
  bold: { kind: 'mark', labelKey: 'bold', mark: 'strong', run: toggleMark(schema.marks.strong) },
  blockquote: { group: 'text', kind: 'block', labelKey: 'blockquote', run: wrapIn(schema.nodes.blockquote) },
  bulletList: { group: 'lists', kind: 'block', labelKey: 'bulletList', run: wrapInList(schema.nodes.bullet_list) },
  callout: { group: 'text', kind: 'block', labelKey: 'callout', run: wrapIn(schema.nodes.callout) },
  code: { kind: 'mark', labelKey: 'code', mark: 'code', run: toggleMark(schema.marks.code) },
  codeBlock: { group: 'advanced', kind: 'block', labelKey: 'codeBlock', run: setBlockType(schema.nodes.code_block) },
  diagram: {
    group: 'advanced',
    kind: 'block',
    labelKey: 'diagram',
    run: setBlockType(schema.nodes.code_block, { language: PAGE_DIAGRAM_LANGUAGE, shown: 'both' }),
  },
  tableOfContents: {
    group: 'advanced',
    kind: 'block',
    labelKey: 'tableOfContents',
    run: insertPageNode(schema.nodes.table_of_contents.createChecked()),
  },
  formula: {
    group: 'advanced',
    kind: 'block',
    labelKey: 'formula',
    run: setBlockType(schema.nodes.code_block, { language: PAGE_FORMULA_LANGUAGE, shown: 'both' }),
  },
  formulaInline: {
    group: 'advanced',
    kind: 'block',
    labelKey: 'formulaInline',
    run: insertPageNode(schema.nodes.formula.createChecked()),
  },
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
  italic: { kind: 'mark', labelKey: 'italic', mark: 'em', run: toggleMark(schema.marks.em) },
  link: { kind: 'mark', labelKey: 'link', mark: 'link', run: askForTheLinkField },
  strike: { kind: 'mark', labelKey: 'strike', mark: 'strike', run: toggleMark(schema.marks.strike) },
  underline: { kind: 'mark', labelKey: 'underline', mark: 'underline', run: toggleMark(schema.marks.underline) },
  image: { group: 'media', kind: 'block', labelKey: 'insertImage', run: askForPageImage },
  subpage: { group: 'advanced', kind: 'block', labelKey: 'subpage', run: askForPageChild },
  collection: { group: 'advanced', kind: 'block', labelKey: 'collection', run: askForACollection },
  collectionView: {
    group: 'advanced',
    kind: 'block',
    labelKey: 'collectionView',
    run: askForACollectionAlreadyWritten,
  },
  pageLink: { group: 'advanced', kind: 'block', labelKey: 'pageLink', run: askForAPageAlreadyWritten },
  person: { group: 'advanced', kind: 'block', labelKey: 'person', run: askForAPerson },
  emoji: { group: 'advanced', kind: 'block', labelKey: 'emoji', run: askForEmoji },
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

/** Defers to the default handler inside code blocks, which keep their own newlines. */
const breakTheLineWithoutLeavingTheBlock =
  (schema: Schema): Command =>
  (state, dispatch) => {
    const hardBreak = schema.nodes.hard_break;
    if (hardBreak === undefined) return false;
    if (state.selection.$from.parent.type.spec.code === true) return false;
    dispatch?.(state.tr.replaceSelectionWith(hardBreak.create()).scrollIntoView());
    return true;
  };

const createPageEditorWritingRules = (schema: Schema): EditorPlugin =>
  inputRules({
    rules: [
      turnTheLineInto(PAGE_EDITOR_HEADING_INPUT_PATTERN, schema.nodes.heading, (match) => ({
        level: match[1]?.length ?? 1,
      })),
      wrappingInputRule(PAGE_EDITOR_BULLET_LIST_INPUT_PATTERN, schema.nodes.bullet_list),
      wrappingInputRule(PAGE_EDITOR_ORDERED_LIST_INPUT_PATTERN, schema.nodes.ordered_list, (match) => ({
        order: Number(match[1]),
      })),
      wrappingInputRule(PAGE_EDITOR_TASK_LIST_INPUT_PATTERN, schema.nodes.task_list),
      wrappingInputRule(PAGE_EDITOR_BLOCKQUOTE_INPUT_PATTERN, schema.nodes.blockquote),
      drawPageDivider(schema),
      writePageLink(schema),
      writeInlineMark(PAGE_EDITOR_BOLD_INPUT_PATTERN, schema.marks.strong),
      writeInlineMark(PAGE_EDITOR_ITALIC_INPUT_PATTERN, schema.marks.em),
      writeInlineMark(PAGE_EDITOR_CODE_INPUT_PATTERN, schema.marks.code),
      writeInlineMark(PAGE_EDITOR_STRIKE_INPUT_PATTERN, schema.marks.strike),
      turnTheLineInto(PAGE_EDITOR_CODE_BLOCK_INPUT_PATTERN, schema.nodes.code_block, (match) => ({
        language: readWrittenCodeLanguage(match[1]),
      })),
    ],
  });

export const createPageEditorPlugins = (
  schema: Schema,
  selectBlockLabel: string,
  insertBlockLabel: string,
  resizeColumnLabel: string = selectBlockLabel,
  blockCommentsLabel: string = selectBlockLabel,
  writeHereLabel = '',
  foldHeadingLabel = '',
): readonly EditorPlugin[] => {
  // Created once and shared: the block id plugin carries the state these rules remember.
  const writingRules = createPageEditorWritingRules(schema);

  return [
    history(),
    writingRules,
    keymap({ 'Mod-y': redoPageEditorStep }),
    // Before the shortcut bindings, whose Tab nests blocks: inside a table Tab must move between cells.
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
        ['Backspace', chainCommands(undoInputRule, deletePageEditorBlockKeepingChildren)],
        ['Delete', deletePageEditorBlockKeepingChildren],
      ]),
    ),
    keymap(Object.fromEntries([['Shift-Enter', breakTheLineWithoutLeavingTheBlock(schema)]])),
    // Before `baseKeymap`, whose generic split would turn the second bullet into a paragraph.
    keymap(Object.fromEntries([['Enter', splitPageEditorListPoint]])),
    keymap(baseKeymap),
    // Lets the cursor sit beside a table, divider or image at the page edge, where no paragraph is reachable.
    gapCursor(),
    createPageEditorBlockIdPlugin(writingRules),
    createPageEditorBlockHandlePlugin(selectBlockLabel, insertBlockLabel),
    createPageEditorBlockMenuPlugin(),
    createPageEditorBlockCommentPlugin(blockCommentsLabel),
    createPageEditorRestrictedBlocksPlugin(),
    createPageEditorBlockDragPlugin(),
    createPageEditorColumnCleanupPlugin(),
    createPageEditorContentsPlugin(),
    createPageEditorColumnResizePlugin(resizeColumnLabel),
    createPageEditorPlaceholderPlugin(writeHereLabel),
    createPageEditorHeadingFoldPlugin(foldHeadingLabel),
    createPageEditorFindPlugin(),
    // Last, so the page's own rules win over table handling (column drag, cross-cell selection).
    columnResizing({ cellMinWidth: PAGE_EDITOR_TABLE_MINIMUM_CELL_WIDTH }),
    tableEditing(),
  ];
};
