import type { PageEmbedProvider } from '@company-brain/shared';
import {
  PAGE_CODE_LANGUAGES,
  pageAssetAttrsSchema,
  pageEmbedAttrsSchema,
  pageFileAttrsSchema,
  pageImageAttrsSchema,
  pageMediaAttrsSchema,
  pageMentionAttrsSchema,
} from '@company-brain/shared';
import { baseKeymap, chainCommands, setBlockType, toggleMark, wrapIn } from 'prosemirror-commands';
import { gapCursor } from 'prosemirror-gapcursor';
import { history } from 'prosemirror-history';
import { InputRule, inputRules, undoInputRule, wrappingInputRule } from 'prosemirror-inputrules';
import { keymap } from 'prosemirror-keymap';
import type { Attrs, Node as EditorNode, MarkType, NodeType, Schema } from 'prosemirror-model';
import { wrapInList } from 'prosemirror-schema-list';
import type { Command, Plugin as EditorPlugin, EditorState } from 'prosemirror-state';
import { Selection } from 'prosemirror-state';
import { columnResizing, tableEditing } from 'prosemirror-tables';
import { PAGE_EDITOR_TABLE_MINIMUM_CELL_WIDTH } from '../constants/pages.editor.blocks.constants';
import {
  PAGE_EDITOR_DIAGRAM_LANGUAGE,
  PAGE_EDITOR_FORMULA_LANGUAGE,
} from '../constants/pages.editor.diagram.constants';
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
import { askForACollection, askForACollectionAlreadyWritten } from './pages.editor.collection.lib';
import { createPageEditorColumnResizePlugin } from './pages.editor.column-resize.plugin.lib';
import { createPageEditorColumnCleanupPlugin } from './pages.editor.columns.plugin.lib';
import { createPageEditorContentsPlugin } from './pages.editor.contents.plugin.lib';
import { readCarriedAttrs } from './pages.editor.convert.lib';
import { openFoldedHeadingBeforeWriting, openFoldsReachingTheEnd } from './pages.editor.heading-fold.lib';
import { createPageEditorHeadingFoldPlugin } from './pages.editor.heading-fold.plugin.lib';
import { redoPageEditorStep, undoPageEditorStep } from './pages.editor.history.lib';
import { askForPageImage } from './pages.editor.image.lib';
import { askForTheLinkField } from './pages.editor.link.lib';
import { splitPageEditorListPoint } from './pages.editor.list.lib';
import { deletePageEditorBlockKeepingChildren, splitOutOfNestedBlock } from './pages.editor.nesting.lib';
import { createPageEditorPlaceholderPlugin } from './pages.editor.placeholder.plugin.lib';
import { createPageEditorShortcutBindings } from './pages.editor.shortcuts.lib';
import { askForAPageAlreadyWritten, askForPageChild } from './pages.editor.subpage.lib';
import { createPageTable, goToNextPageTableCell, goToPreviousPageTableCell } from './pages.editor.table.lib';
import { leaveSomewhereToWriteUnder } from './pages.editor.write-under.lib';

const headingInputRule = /^(#{1,3})\s$/;
const bulletListInputRule = /^\s*([-+*])\s$/;
const orderedListInputRule = /^\s*(\d+)\.\s$/;
const taskListInputRule = /^\s*\[ ?\]\s$/;
const blockquoteInputRule = /^\s*>\s$/;
const dividerInputRule = /^---$/;
const codeBlockInputRule = /^```(\w+)?\s$/;
const linkInputRule = /\[([^\]]+)]\((https?:\/\/[^\s)]+)\)$/;
const boldInputRule = /\*\*([^*]+)\*\*$/;
/** One asterisk, and not the second of a pair: `**` is bold and must not be read as italic twice. */
const italicInputRule = /(?<!\*)\*([^*]+)\*$/;
const codeInputRule = /`([^`]+)`$/;
const strikeInputRule = /~~([^~]+)~~$/;

/** The language written after the backticks, kept only when it is one this version knows. */
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

/**
 * Turns `[what it is called](where it points)` into the words themselves,
 * carrying the link.
 *
 * It is the way a link is written by hand everywhere else — Markdown, Obsidian —
 * so writing it that way here should mean the same thing rather than leaving
 * the brackets on the page.
 */
const writePageLink = (schema: Schema): InputRule =>
  new InputRule(linkInputRule, (state, match, start, end) => {
    const [, label, url] = match;
    if (label === undefined || url === undefined) return null;
    return state.tr.replaceRangeWith(start, end, schema.text(label, [schema.marks.link.create({ href: url })]));
  });

/**
 * Turns the line into the kind of block the sign at its start stands for,
 * keeping who the block is.
 *
 * The identity travels with it — its name, its colours, what was said about it —
 * for the same reason it travels when a block is turned into another type by
 * hand: writing `# ` in front of a line changes its shape, not which line it is.
 */
const turnTheLineInto = (pattern: RegExp, type: NodeType, readAttrs: (match: RegExpMatchArray) => Attrs): InputRule =>
  new InputRule(pattern, (state, match, start, end) => {
    const written = state.doc.resolve(start);
    if (!written.node(-1).canReplaceWith(written.index(-1), written.indexAfter(-1), type)) return null;
    const kept = { ...readCarriedAttrs(written.parent.attrs), ...readAttrs(match) };
    return state.tr.delete(start, end).setBlockType(start, start, type, kept);
  });

/**
 * Turns what is written around a stretch of text into the mark it stands for.
 *
 * The signs are taken out with it: `**so**` is how bold is written by hand
 * everywhere else, and leaving the asterisks behind would be answering half of
 * what was asked. Inside a block of code nothing of this happens — what is
 * written there is what was meant, sign for sign.
 */
const writeInlineMark = (pattern: RegExp, mark: MarkType): InputRule =>
  new InputRule(pattern, (state, match, start, end) => {
    const written = match[1];
    if (written === undefined) return null;
    if (state.doc.resolve(start).parent.type.spec.code === true) return null;
    return state.tr.replaceWith(start, end, state.schema.text(written, [mark.create()])).removeStoredMark(mark);
  });

const canInsertPageNode = (state: EditorState, nodeType: NodeType): boolean => {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    if ($from.node(depth).canReplaceWith($from.index(depth), $from.index(depth), nodeType)) return true;
  }
  return false;
};

/**
 * Puts a block on the page where the cursor is.
 *
 * A block that is selected — a picture, a document, a player — is what someone
 * is looking at, not a hole to drop the next thing into, so the new block lands
 * after it. Replacing it is how a page loses what it was already holding.
 */
const insertPageNode =
  (node: EditorNode): Command =>
  (state, dispatch) => {
    if (!canInsertPageNode(state, node.type)) return false;
    if (dispatch === undefined) return true;
    /** A selection is asked what it holds rather than what class it is, which is not the same answer twice. */
    const { selection } = state;
    if ('node' in selection) dispatch(state.tr.insert(selection.to, node));
    else dispatch(state.tr.replaceSelectionWith(node));
    return true;
  };

const createMinimalPageToggleNode = (schema: Schema, toggleSummary: string): EditorNode =>
  schema.nodes.toggle.createChecked({ summary: toggleSummary }, schema.nodes.paragraph.createChecked());

/** A button starts with a line to write in: what it writes is what it holds, and it must hold something. */
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

/** What each kind of asset is allowed to carry, so an insert can never save a shape the page refuses. */
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
  const shape = readPageAssetAttrsShape(nodeType);
  const attrs = shape.safeParse(buildPageAssetAttrs(options));
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
  buttonLabel: string = toggleSummary,
): Readonly<Record<string, PageEditorCommand>> => ({
  /** A button, and what it writes when pressed, which is whatever is written inside it. */
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
  /** A diagram is a block of code written in the one language a page knows how to draw. */
  diagram: {
    group: 'advanced',
    kind: 'block',
    labelKey: 'diagram',
    run: setBlockType(schema.nodes.code_block, { language: PAGE_EDITOR_DIAGRAM_LANGUAGE, shown: 'both' }),
  },
  /** What the page holds, listed by the page itself: it is asked for, never written. */
  tableOfContents: {
    group: 'advanced',
    kind: 'block',
    labelKey: 'tableOfContents',
    run: insertPageNode(schema.nodes.table_of_contents.createChecked()),
  },
  /** A formula is a block of code written in the language formulas have been written in for fifty years. */
  formula: {
    group: 'advanced',
    kind: 'block',
    labelKey: 'formula',
    run: setBlockType(schema.nodes.code_block, { language: PAGE_EDITOR_FORMULA_LANGUAGE, shown: 'both' }),
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
  /** Where a stretch of writing takes whoever presses it: asked for in a field, never typed in as a mark. */
  link: { kind: 'mark', labelKey: 'link', mark: 'link', run: askForTheLinkField },
  strike: { kind: 'mark', labelKey: 'strike', mark: 'strike', run: toggleMark(schema.marks.strike) },
  underline: { kind: 'mark', labelKey: 'underline', mark: 'underline', run: toggleMark(schema.marks.underline) },
  image: { group: 'media', kind: 'block', labelKey: 'insertImage', run: askForPageImage },
  /** A page of its own, hanging from this one, asked for rather than written. */
  subpage: { group: 'advanced', kind: 'block', labelKey: 'subpage', run: askForPageChild },
  /** A collection of its own, kept here: a page with a shape, asked for rather than written. */
  collection: { group: 'advanced', kind: 'block', labelKey: 'collection', run: askForACollection },
  /** A collection that lives somewhere else, looked at from here. */
  collectionView: {
    group: 'advanced',
    kind: 'block',
    labelKey: 'collectionView',
    run: askForACollectionAlreadyWritten,
  },
  /** A page that is already written, named here: the same looking `@` does, asked for from the menu. */
  pageLink: { group: 'advanced', kind: 'block', labelKey: 'pageLink', run: askForAPageAlreadyWritten },
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

/** Everything the editor answers to as it is written, kept as one plugin so what it remembers can be carried. */
const createPageEditorWritingRules = (schema: Schema): EditorPlugin =>
  inputRules({
    rules: [
      turnTheLineInto(headingInputRule, schema.nodes.heading, (match) => ({ level: match[1]?.length ?? 1 })),
      wrappingInputRule(bulletListInputRule, schema.nodes.bullet_list),
      wrappingInputRule(orderedListInputRule, schema.nodes.ordered_list, (match) => ({ order: Number(match[1]) })),
      wrappingInputRule(taskListInputRule, schema.nodes.task_list),
      wrappingInputRule(blockquoteInputRule, schema.nodes.blockquote),
      drawPageDivider(schema),
      writePageLink(schema),
      writeInlineMark(boldInputRule, schema.marks.strong),
      writeInlineMark(italicInputRule, schema.marks.em),
      writeInlineMark(codeInputRule, schema.marks.code),
      writeInlineMark(strikeInputRule, schema.marks.strike),
      turnTheLineInto(codeBlockInputRule, schema.nodes.code_block, (match) => ({
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
  /** Made once per page: what it remembers is carried by the plugin that hands out identities. */
  const writingRules = createPageEditorWritingRules(schema);

  return [
    history(),
    writingRules,
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
        ['Backspace', chainCommands(undoInputRule, deletePageEditorBlockKeepingChildren)],
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
    createPageEditorBlockIdPlugin(writingRules),
    createPageEditorBlockHandlePlugin(selectBlockLabel, insertBlockLabel),
    createPageEditorBlockMenuPlugin(),
    createPageEditorBlockCommentPlugin(blockCommentsLabel),
    createPageEditorBlockDragPlugin(),
    createPageEditorColumnCleanupPlugin(),
    createPageEditorContentsPlugin(),
    createPageEditorColumnResizePlugin(resizeColumnLabel),
    createPageEditorPlaceholderPlugin(writeHereLabel),
    createPageEditorHeadingFoldPlugin(foldHeadingLabel),
    /**
     * A table minds its own selection and the width of its columns. It comes last
     * so a cell answers the page's own rules first and the table only what is
     * left — dragging a column edge, selecting across cells.
     *
     * How the table itself is drawn is not left to this plugin: it is a node view
     * like every other, and it lives with the rest of them.
     */
    columnResizing({ cellMinWidth: PAGE_EDITOR_TABLE_MINIMUM_CELL_WIDTH }),
    tableEditing(),
  ];
};
