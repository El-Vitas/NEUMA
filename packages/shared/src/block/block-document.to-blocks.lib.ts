import { isPageDocumentNode } from '../page-document/page-document.node.lib.js';
import type { PageDocumentNodeShape } from '../page-document/page-document.types.js';
import { Result } from '../result.js';
import { PAGE_CONTENT_NODE_TYPES, pageBlockIdSchema, pageContentSchema } from '../schemas/page-content.schema.js';
import { parseBlockContent } from './block-content.lib.js';
import type { BlockType } from './block-content.types.js';
import {
  hasWrapperAttributes,
  readWrapperAttributes,
  splitAttributes,
  takeAttribute,
} from './block-document.attributes.lib.js';
import {
  BLOCK_DOCUMENT_BLOCK_TYPE_BY_NODE,
  BLOCK_DOCUMENT_CONTAINER_NODES,
  BLOCK_DOCUMENT_ERROR_CODE,
  BLOCK_DOCUMENT_LIST_KINDS,
  BLOCK_DOCUMENT_NODE,
  BLOCK_DOCUMENT_ORDER_ATTRIBUTE,
  BLOCK_DOCUMENT_START_FORMAT,
  BLOCK_DOCUMENT_SUMMARY_ATTRIBUTE,
} from './block-document.constants.js';
import { type BlockDocumentError, failBlockDocument } from './block-document.error.js';
import { deriveBlockId } from './block-document.id.lib.js';
import { inlineNodesToRichText, textNodesToPlainText } from './block-document.text.lib.js';
import type {
  BlockDraft,
  BlockNestedLayer,
  BlockTree,
  BlockWrapperAttributes,
  DocumentToBlocksInput,
} from './block-document.types.js';
import { BLOCK_TYPE } from './block-type.constants.js';

type KeyedValues = Readonly<Record<string, unknown>>;

interface ConversionContext {
  readonly pageId: string;
  readonly spaceId: string;
}

/** A block row before its content is checked against the schema of its type. */
interface RowDraft {
  readonly children: readonly string[];
  readonly format: KeyedValues;
  readonly id: string;
  readonly nested: readonly BlockNestedLayer[];
  readonly parentId: string | null;
  readonly properties: KeyedValues;
  readonly type: BlockType;
}

/** The rows a run of sibling nodes became, in reading order, and the type of the last sibling. */
interface Converted {
  readonly ids: readonly string[];
  readonly lastType: BlockType | null;
  readonly rows: readonly RowDraft[];
}

interface Position {
  readonly parentId: string;
  readonly path: readonly number[];
  readonly precedingType: BlockType | null;
}

type Conversion = Result<Converted, BlockDocumentError>;

const forwardFailure = <Value>(failed: Result<unknown, BlockDocumentError>): Result<Value, BlockDocumentError> =>
  Result.fail(failed.getError());

const readDeclaredId = (attributes: PageDocumentNodeShape['attrs']): string | undefined => {
  const declared = attributes?.id;
  return pageBlockIdSchema.safeParse(declared).success && typeof declared === 'string' ? declared : undefined;
};

const mergeConverted = (previous: Converted, next: Converted): Converted => ({
  ids: [...previous.ids, ...next.ids],
  lastType: next.lastType,
  rows: [...previous.rows, ...next.rows],
});

const describeNode = (node: PageDocumentNodeShape, path: readonly number[]): string =>
  `${node.type} at ${path.join('.')}`;

const convertTitleProperties = (
  node: PageDocumentNodeShape,
  summary: unknown,
): Result<KeyedValues, BlockDocumentError> => {
  switch (node.type) {
    case BLOCK_DOCUMENT_NODE.paragraph:
    case 'heading': {
      const title = inlineNodesToRichText(node.content ?? []);
      return title.isFail() ? forwardFailure(title) : Result.ok({ title: title.getValue() });
    }
    case 'code_block': {
      const title = textNodesToPlainText(node.content ?? []);
      return title.isFail() ? forwardFailure(title) : Result.ok({ title: title.getValue() });
    }
    case 'toggle':
      return Result.ok({ title: typeof summary === 'string' && summary !== '' ? [{ insert: summary }] : [] });
    default:
      return Result.ok({});
  }
};

const convertChildren = (
  node: PageDocumentNodeShape,
  parentId: string,
  path: readonly number[],
  context: ConversionContext,
): Conversion =>
  BLOCK_DOCUMENT_CONTAINER_NODES.includes(node.type)
    ? convertSiblings(node.content ?? [], { parentId, path, precedingType: null }, 0, context)
    : Result.ok({ ids: [], lastType: null, rows: [] });

const convertBlock = (node: PageDocumentNodeShape, position: Position, context: ConversionContext): Conversion => {
  const blockType = BLOCK_DOCUMENT_BLOCK_TYPE_BY_NODE[node.type];
  if (blockType === undefined) {
    return failBlockDocument(
      BLOCK_DOCUMENT_ERROR_CODE.invalidDocument,
      `The node ${describeNode(node, position.path)} cannot stand where it is`,
    );
  }
  const { rest, value: summary } =
    node.type === 'toggle'
      ? takeAttribute(node.attrs, BLOCK_DOCUMENT_SUMMARY_ATTRIBUTE)
      : { rest: node.attrs, value: undefined };
  const split = splitAttributes(node.type, rest);
  if (split.isFail()) return forwardFailure(split);
  const title = convertTitleProperties(node, summary);
  if (title.isFail()) return forwardFailure(title);
  const id = split.getValue().id ?? deriveBlockId(context.pageId, position.path);
  const children = convertChildren(node, id, position.path, context);
  if (children.isFail()) return children;
  const headerProperties = node.type === BLOCK_DOCUMENT_NODE.tableHeader ? { isHeader: true } : {};
  const row: RowDraft = {
    children: children.getValue().ids,
    format: split.getValue().format,
    id,
    nested: [],
    parentId: position.parentId,
    properties: { ...split.getValue().properties, ...title.getValue(), ...headerProperties },
    type: blockType,
  };
  return Result.ok({ ids: [id], lastType: blockType, rows: [row, ...children.getValue().rows] });
};

const convertUnsupported = (
  node: PageDocumentNodeShape,
  position: Position,
  context: ConversionContext,
): Conversion => {
  const id = readDeclaredId(node.attrs) ?? deriveBlockId(context.pageId, position.path);
  const row: RowDraft = {
    children: [],
    format: {},
    id,
    nested: [],
    parentId: position.parentId,
    properties: { node },
    type: BLOCK_TYPE.unsupported,
  };
  return Result.ok({ ids: [id], lastType: BLOCK_TYPE.unsupported, rows: [row] });
};

interface ItemLine {
  readonly format: KeyedValues;
  readonly title: KeyedValues;
}

const convertItemLine = (first: PageDocumentNodeShape): Result<ItemLine, BlockDocumentError> => {
  const title = inlineNodesToRichText(first.content ?? []);
  if (title.isFail()) return forwardFailure(title);
  const attributes = readWrapperAttributes(first.attrs);
  if (attributes.isFail()) return forwardFailure(attributes);
  const format = hasWrapperAttributes(attributes.getValue()) ? { line: attributes.getValue() } : {};
  return Result.ok({ format, title: { title: title.getValue() } });
};

const isParagraph = (node: unknown): node is PageDocumentNodeShape =>
  isPageDocumentNode(node) && node.type === BLOCK_DOCUMENT_NODE.paragraph;

const NO_FIRST_PARAGRAPH: ItemLine = { format: { line: null }, title: { title: [] } };

const convertListItem = (
  item: PageDocumentNodeShape,
  position: Position,
  blockType: BlockType,
  groupFormat: KeyedValues,
  context: ConversionContext,
): Conversion => {
  const split = splitAttributes(item.type, item.attrs);
  if (split.isFail()) return forwardFailure(split);
  const content = item.content ?? [];
  const first = content[0];
  const line = isParagraph(first) ? convertItemLine(first) : Result.ok(NO_FIRST_PARAGRAPH);
  if (line.isFail()) return forwardFailure(line);
  const id = split.getValue().id ?? deriveBlockId(context.pageId, position.path);
  const offset = isParagraph(first) ? 1 : 0;
  const children = convertSiblings(
    content.slice(offset),
    { parentId: id, path: position.path, precedingType: null },
    offset,
    context,
  );
  if (children.isFail()) return children;
  const row: RowDraft = {
    children: children.getValue().ids,
    format: { ...split.getValue().format, ...groupFormat, ...line.getValue().format },
    id,
    nested: [],
    parentId: position.parentId,
    properties: { ...split.getValue().properties, ...line.getValue().title },
    type: blockType,
  };
  return Result.ok({ ids: [id], lastType: blockType, rows: [row, ...children.getValue().rows] });
};

const buildGroupFormat = (
  wrapperAttributes: BlockWrapperAttributes,
  order: unknown,
  startsAfterSameKind: boolean,
): KeyedValues => ({
  ...(hasWrapperAttributes(wrapperAttributes) || startsAfterSameKind ? { listWrapper: wrapperAttributes } : {}),
  ...(order === undefined ? {} : { [BLOCK_DOCUMENT_START_FORMAT]: order }),
});

const convertList = (wrapper: PageDocumentNodeShape, position: Position, context: ConversionContext): Conversion => {
  const kind = BLOCK_DOCUMENT_LIST_KINDS[wrapper.type];
  if (kind === undefined) {
    return failBlockDocument(BLOCK_DOCUMENT_ERROR_CODE.invalidDocument, `${wrapper.type} is not a list`);
  }
  const { rest, value: order } =
    wrapper.type === BLOCK_DOCUMENT_NODE.orderedList
      ? takeAttribute(wrapper.attrs, BLOCK_DOCUMENT_ORDER_ATTRIBUTE)
      : { rest: wrapper.attrs, value: undefined };
  const wrapperAttributes = readWrapperAttributes(rest);
  if (wrapperAttributes.isFail()) return forwardFailure(wrapperAttributes);
  const groupFormat = buildGroupFormat(wrapperAttributes.getValue(), order, position.precedingType === kind.blockType);
  let combined: Converted = { ids: [], lastType: position.precedingType, rows: [] };
  for (const [index, item] of (wrapper.content ?? []).entries()) {
    if (!isPageDocumentNode(item) || item.type !== kind.itemNode) {
      return failBlockDocument(
        BLOCK_DOCUMENT_ERROR_CODE.invalidDocument,
        `${describeNode(wrapper, position.path)} holds something that is not a ${kind.itemNode}`,
      );
    }
    const itemPosition = { parentId: position.parentId, path: [...position.path, index], precedingType: null };
    const converted = convertListItem(item, itemPosition, kind.blockType, index === 0 ? groupFormat : {}, context);
    if (converted.isFail()) return converted;
    combined = mergeConverted(combined, converted.getValue());
  }
  return Result.ok(combined);
};

const findRow = (rows: readonly RowDraft[], id: string): RowDraft | undefined => rows.find((row) => row.id === id);

const buildNestedLayer = (
  attributes: BlockWrapperAttributes,
  childrenAttributes: BlockWrapperAttributes,
  from: number,
): BlockNestedLayer => ({
  ...(hasWrapperAttributes(attributes) ? { attrs: attributes } : {}),
  ...(hasWrapperAttributes(childrenAttributes) ? { childrenAttrs: childrenAttributes } : {}),
  from,
});

const isBlockChildren = (node: unknown): node is PageDocumentNodeShape =>
  isPageDocumentNode(node) && node.type === BLOCK_DOCUMENT_NODE.blockChildren;

const convertNestedBlock = (
  nested: PageDocumentNodeShape,
  position: Position,
  context: ConversionContext,
): Conversion => {
  const [block, childrenWrapper, ...extra] = nested.content ?? [];
  if (!isPageDocumentNode(block) || !isBlockChildren(childrenWrapper) || extra.length > 0) {
    return failBlockDocument(
      BLOCK_DOCUMENT_ERROR_CODE.invalidDocument,
      `${describeNode(nested, position.path)} must hold one block followed by its children`,
    );
  }
  const attributes = readWrapperAttributes(nested.attrs);
  const childrenAttributes = readWrapperAttributes(childrenWrapper.attrs);
  if (attributes.isFail()) return forwardFailure(attributes);
  if (childrenAttributes.isFail()) return forwardFailure(childrenAttributes);
  const first = convertNode(block, { ...position, path: [...position.path, 0] }, context);
  if (first.isFail()) return first;
  const hostId = first.getValue().ids.at(-1);
  const host = hostId === undefined ? undefined : findRow(first.getValue().rows, hostId);
  if (host === undefined) {
    return failBlockDocument(
      BLOCK_DOCUMENT_ERROR_CODE.invalidDocument,
      `${describeNode(nested, position.path)} holds no block`,
    );
  }
  const lastChildId = host.children.at(-1);
  const precedingType = lastChildId === undefined ? null : (findRow(first.getValue().rows, lastChildId)?.type ?? null);
  const children = convertSiblings(
    childrenWrapper.content ?? [],
    { parentId: host.id, path: [...position.path, 1], precedingType },
    0,
    context,
  );
  if (children.isFail()) return children;
  const layer = buildNestedLayer(attributes.getValue(), childrenAttributes.getValue(), host.children.length);
  const updatedHost: RowDraft = {
    ...host,
    children: [...host.children, ...children.getValue().ids],
    nested: [...host.nested, layer],
  };
  const rows = first.getValue().rows.map((row) => (row.id === host.id ? updatedHost : row));
  return Result.ok({
    ids: first.getValue().ids,
    lastType: first.getValue().lastType,
    rows: [...rows, ...children.getValue().rows],
  });
};

const convertNode = (node: PageDocumentNodeShape, position: Position, context: ConversionContext): Conversion => {
  switch (node.type) {
    case BLOCK_DOCUMENT_NODE.bulletList:
    case BLOCK_DOCUMENT_NODE.orderedList:
    case BLOCK_DOCUMENT_NODE.taskList:
      return convertList(node, position, context);
    case BLOCK_DOCUMENT_NODE.nestedBlock:
      return convertNestedBlock(node, position, context);
    default:
      return PAGE_CONTENT_NODE_TYPES.includes(node.type)
        ? convertBlock(node, position, context)
        : convertUnsupported(node, position, context);
  }
};

const convertSiblings = (
  nodes: readonly unknown[],
  position: Position,
  offset: number,
  context: ConversionContext,
): Conversion => {
  let combined: Converted = { ids: [], lastType: position.precedingType, rows: [] };
  for (const [index, node] of nodes.entries()) {
    if (!isPageDocumentNode(node)) {
      return failBlockDocument(
        BLOCK_DOCUMENT_ERROR_CODE.invalidDocument,
        'A block position holds something that is not a node',
      );
    }
    const nodePosition = {
      parentId: position.parentId,
      path: [...position.path, offset + index],
      precedingType: combined.lastType,
    };
    const converted = convertNode(node, nodePosition, context);
    if (converted.isFail()) return converted;
    combined = mergeConverted(combined, converted.getValue());
  }
  return Result.ok(combined);
};

const findDuplicateId = (rows: readonly RowDraft[]): string | undefined => {
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.id)) return row.id;
    seen.add(row.id);
  }
  return undefined;
};

const finalizeRow = (row: RowDraft, spaceId: string): Result<BlockDraft, BlockDocumentError> => {
  const format = row.nested.length === 0 ? row.format : { ...row.format, nested: row.nested };
  const parsed = parseBlockContent(row.type, row.properties, format);
  if (parsed.isOk()) {
    return Result.ok({
      ...parsed.getValue(),
      children: row.children,
      id: row.id,
      parentId: row.parentId,
      spaceId,
    });
  }
  const issues = parsed
    .getError()
    .issues.map((issue) => `${issue.field}: ${issue.message}`)
    .join('; ');
  return failBlockDocument(
    BLOCK_DOCUMENT_ERROR_CODE.invalidBlock,
    `Block ${row.id} (${row.type}) is not valid: ${issues}`,
  );
};

const buildPageRow = (input: DocumentToBlocksInput, children: readonly string[]): RowDraft => ({
  children,
  format: {
    ...(input.cover == null ? {} : { cover: input.cover }),
    ...(input.icon == null ? {} : { icon: input.icon }),
  },
  id: input.pageId,
  nested: [],
  parentId: input.parentId,
  properties: {
    ...(input.defaultTemplateId == null ? {} : { defaultTemplateId: input.defaultTemplateId }),
    title: input.title === '' ? [] : [{ insert: input.title }],
    ...(input.template == null ? {} : { template: input.template }),
    ...(input.propertyValues == null ? {} : { values: input.propertyValues }),
  },
  type: BLOCK_TYPE.page,
});

/**
 * Turns a page document into one page block and one block per document block, wrappers dissolved. A node keeps the
 * id it has; one without gets an id derived from the page id and its path in the document, so the result is the same
 * on every run. Two blocks with one id are an error.
 */
export const documentToBlocks = (input: DocumentToBlocksInput): Result<BlockTree, BlockDocumentError> => {
  const content = pageContentSchema.safeParse(input.content);
  if (!content.success) {
    return failBlockDocument(
      BLOCK_DOCUMENT_ERROR_CODE.invalidDocument,
      `The page document is not valid: ${content.error.message}`,
    );
  }
  const context = { pageId: input.pageId, spaceId: input.spaceId };
  const converted = convertSiblings(
    content.data.content,
    { parentId: input.pageId, path: [], precedingType: null },
    0,
    context,
  );
  if (converted.isFail()) return forwardFailure(converted);
  const rows = [buildPageRow(input, converted.getValue().ids), ...converted.getValue().rows];
  const duplicate = findDuplicateId(rows);
  if (duplicate !== undefined) {
    return failBlockDocument(
      BLOCK_DOCUMENT_ERROR_CODE.duplicateBlockId,
      `The id ${duplicate} is used by more than one block`,
    );
  }
  const drafts: BlockDraft[] = [];
  for (const row of rows) {
    const draft = finalizeRow(row, input.spaceId);
    if (draft.isFail()) return forwardFailure(draft);
    drafts.push(draft.getValue());
  }
  const page = drafts.at(0);
  return page === undefined
    ? failBlockDocument(BLOCK_DOCUMENT_ERROR_CODE.invalidDocument, 'No page block was built')
    : Result.ok({ blocks: drafts.slice(1), page });
};
