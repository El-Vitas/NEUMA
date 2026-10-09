import type { Attrs, Node as EditorNode, NodeRange, NodeType, Schema } from 'prosemirror-model';
import { Fragment } from 'prosemirror-model';
import type { Command, EditorState } from 'prosemirror-state';
import { NodeSelection, Selection } from 'prosemirror-state';
import { isPageEditorCellSelection } from '../../structure/lib/pages.editor.table.lib';
import {
  PAGE_EDITOR_ARRANGEMENT_BLOCK_TYPES,
  PAGE_EDITOR_BLOCK_TARGETS,
  PAGE_EDITOR_BLOCKS_BEYOND_THEIR_LINES,
  PAGE_EDITOR_CARRIED_BLOCK_ATTRS,
  PAGE_EDITOR_NOTHING_TO_CARRY,
} from '../constants/pages.editor.convert.constants';
import type {
  PageEditorBlockConversion,
  PageEditorBlockLines,
  PageEditorBlockShape,
  PageEditorBlockTarget,
  PageEditorConversionSource,
} from '../types/pages.editor.convert.types';
import { findSelectedPageBlocks } from './pages.editor.block-range.lib';

const mergeLines = (read: readonly PageEditorBlockLines[]): PageEditorBlockLines => ({
  keepsEverything: read.every((entry) => entry.keepsEverything),
  lines: read.flatMap((entry) => entry.lines),
});

/**
 * Reads a block as the lines of text it holds, descending into nested blocks, and reports whether anything is lost:
 * a block with no text, or a nesting whose children stop hanging from it.
 */
const readBlockLines = (block: EditorNode): PageEditorBlockLines => {
  if (PAGE_EDITOR_ARRANGEMENT_BLOCK_TYPES.includes(block.type.name)) return PAGE_EDITOR_NOTHING_TO_CARRY;
  if (block.isTextblock) return { keepsEverything: true, lines: [block.content] };
  if (block.childCount === 0) return PAGE_EDITOR_NOTHING_TO_CARRY;
  const read = mergeLines(block.children.map(readBlockLines));
  return PAGE_EDITOR_BLOCKS_BEYOND_THEIR_LINES.includes(block.type.name) ? { ...read, keepsEverything: false } : read;
};

const readSelectedBlocks = (state: EditorState): PageEditorConversionSource | null => {
  if (isPageEditorCellSelection(state)) return null;
  const range = findSelectedPageBlocks(state);
  if (range === null) return null;
  const blocks = range.parent.children.slice(range.startIndex, range.endIndex);
  const read = mergeLines(blocks.map(readBlockLines));
  const first = blocks[0];
  if (read.lines.length === 0 || first === undefined) return null;
  return { ...read, carried: readCarriedAttrs(first.attrs), range };
};

/** Identity, colours and comments survive a type change. */
export const readCarriedAttrs = (attrs: Attrs): Attrs =>
  Object.fromEntries(PAGE_EDITOR_CARRIED_BLOCK_ATTRS.flatMap((name) => (name in attrs ? [[name, attrs[name]]] : [])));

const keepAllBuilt = (blocks: readonly (EditorNode | null)[]): readonly EditorNode[] | null => {
  const built = blocks.filter((block): block is EditorNode => block !== null);
  return built.length === blocks.length ? built : null;
};

const buildBlock = (type: NodeType, attrs: Attrs | null, content: Fragment): EditorNode | null =>
  type.validContent(content) ? type.create(attrs, content) : null;

const asPlainText = (schema: Schema, line: Fragment): Fragment => {
  const text = line.textBetween(0, line.size);
  return text.length === 0 ? Fragment.empty : Fragment.from(schema.text(text));
};

const buildTextblocks = (
  schema: Schema,
  shape: Extract<PageEditorBlockShape, { readonly kind: 'textblock' }>,
  lines: readonly Fragment[],
  carried: Attrs,
): readonly EditorNode[] | null => {
  const type = schema.nodes[shape.type];
  if (type === undefined) return null;
  const contentOf = (line: Fragment): Fragment => (type.spec.code === true ? asPlainText(schema, line) : line);
  return keepAllBuilt(lines.map((line) => buildBlock(type, { ...carried, ...shape.attrs }, contentOf(line))));
};

const buildParagraphs = (schema: Schema, lines: readonly Fragment[]): readonly EditorNode[] | null => {
  const paragraph = schema.nodes.paragraph;
  if (paragraph === undefined) return null;
  return keepAllBuilt(lines.map((line) => buildBlock(paragraph, null, line)));
};

const buildHolder = (
  schema: Schema,
  typeName: string,
  lines: readonly Fragment[],
  carried: Attrs,
): readonly EditorNode[] | null => {
  const holder = schema.nodes[typeName];
  const paragraphs = buildParagraphs(schema, lines);
  if (holder === undefined || paragraphs === null) return null;
  const block = buildBlock(holder, carried, Fragment.from([...paragraphs]));
  return block === null ? null : [block];
};

const buildList = (
  schema: Schema,
  shape: Extract<PageEditorBlockShape, { readonly kind: 'list' }>,
  lines: readonly Fragment[],
  carried: Attrs,
): readonly EditorNode[] | null => {
  const list = schema.nodes[shape.type];
  const item = schema.nodes[shape.itemType];
  const paragraphs = buildParagraphs(schema, lines);
  if (list === undefined || item === undefined || paragraphs === null) return null;
  const items = keepAllBuilt(paragraphs.map((paragraph) => buildBlock(item, null, Fragment.from(paragraph))));
  if (items === null) return null;
  const block = buildBlock(list, carried, Fragment.from([...items]));
  return block === null ? null : [block];
};

const buildTargetBlocks = (
  schema: Schema,
  shape: PageEditorBlockShape,
  lines: readonly Fragment[],
  carried: Attrs,
): readonly EditorNode[] | null => {
  switch (shape.kind) {
    case 'textblock':
      return buildTextblocks(schema, shape, lines, carried);
    case 'holder':
      return buildHolder(schema, shape.type, lines, carried);
    default:
      return buildList(schema, shape, lines, carried);
  }
};

const fitsWhereItLives = (range: NodeRange, blocks: readonly EditorNode[]): boolean =>
  range.parent.canReplace(range.startIndex, range.endIndex, Fragment.from([...blocks]));

const isPlainText = (line: Fragment): boolean => {
  for (let index = 0; index < line.childCount; index += 1) {
    const child = line.child(index);
    if (!child.isText || child.marks.length > 0) return false;
  }
  return true;
};

const dropsFormatting = (schema: Schema, shape: PageEditorBlockShape): boolean =>
  shape.kind === 'textblock' && schema.nodes[shape.type]?.spec.code === true;

/** Selects the converted block when the conversion produced exactly one. */
const selectionAfterConversion = (doc: EditorNode, blockStart: number, blockCount: number): Selection =>
  blockCount === 1 ? NodeSelection.create(doc, blockStart) : Selection.near(doc.resolve(blockStart + 1));

const readConversion = (
  state: EditorState,
  source: PageEditorConversionSource,
  target: PageEditorBlockTarget,
): PageEditorBlockConversion | null => {
  const blocks = buildTargetBlocks(state.schema, target.shape, source.lines, source.carried);
  if (blocks === null || !fitsWhereItLives(source.range, blocks)) return null;
  const losesFormatting = dropsFormatting(state.schema, target.shape) && !source.lines.every(isPlainText);
  return { id: target.id, labelKey: target.labelKey, losesContent: !source.keepsEverything || losesFormatting };
};

/**
 * The conversions the current selection can actually go through, each flagged when it would lose something.
 * Every candidate is built against the real document first, so an inapplicable one is never listed.
 */
export const listPageEditorBlockConversions = (state: EditorState): readonly PageEditorBlockConversion[] => {
  const source = readSelectedBlocks(state);
  if (source === null) return [];
  return PAGE_EDITOR_BLOCK_TARGETS.flatMap((target) => {
    const conversion = readConversion(state, source, target);
    return conversion === null ? [] : [conversion];
  });
};

/** Turns the selected blocks into the given type, carrying their text over, as a single undoable change. */
export const createPageEditorBlockConversionCommand =
  (targetId: string): Command =>
  (state, dispatch) => {
    const target = PAGE_EDITOR_BLOCK_TARGETS.find((entry) => entry.id === targetId);
    const source = readSelectedBlocks(state);
    if (target === undefined || source === null) return false;

    const blocks = buildTargetBlocks(state.schema, target.shape, source.lines, source.carried);
    if (blocks === null || !fitsWhereItLives(source.range, blocks)) return false;
    if (dispatch === undefined) return true;

    const transaction = state.tr.replaceWith(source.range.start, source.range.end, [...blocks]);
    transaction.setSelection(selectionAfterConversion(transaction.doc, source.range.start, blocks.length));
    dispatch(transaction.scrollIntoView());
    return true;
  };
