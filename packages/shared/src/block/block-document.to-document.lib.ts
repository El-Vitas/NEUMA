import { Result } from '../result.js';
import { PAGE_CONTENT_SCHEMA_VERSION, pageContentSchema } from '../schemas/page-content.schema.js';
import type { PageContent } from '../schemas/page-content.schema.js';
import { blockFormatMarkersSchema } from './block-content.schemas.js';
import { parseBlockContent } from './block-content.lib.js';
import type { BlockContent, BlockRichText } from './block-content.types.js';
import { joinAttributes, joinWrapperAttributes } from './block-document.attributes.lib.js';
import {
  BLOCK_DOCUMENT_CONTAINER_BLOCK_TYPES,
  BLOCK_DOCUMENT_ERROR_CODE,
  BLOCK_DOCUMENT_LIST_NODES_BY_BLOCK_TYPE,
  BLOCK_DOCUMENT_NODE,
  BLOCK_DOCUMENT_NODE_BY_BLOCK_TYPE,
} from './block-document.constants.js';
import { type BlockDocumentError, failBlockDocument } from './block-document.error.js';
import { plainTextToTextNodes, richTextToInlineNodes } from './block-document.text.lib.js';
import type { BlockDocumentRow, BlockFormatMarkers } from './block-document.types.js';
import { BLOCK_TYPE } from './block-type.constants.js';

interface DocumentNodeDraft {
  readonly attrs?: Readonly<Record<string, unknown>>;
  readonly content?: readonly unknown[];
  readonly type: string;
}

interface ParsedRow {
  readonly children: readonly string[];
  readonly content: BlockContent;
  readonly id: string;
  readonly markers: BlockFormatMarkers;
  readonly parentId: string | null;
}

interface BuildContext {
  readonly rows: ReadonlyMap<string, ParsedRow>;
  readonly claimed: Set<string>;
}

type Built<Value> = Result<Value, BlockDocumentError>;

const forwardFailure = <Value>(failed: Result<unknown, BlockDocumentError>): Built<Value> =>
  Result.fail(failed.getError());

const withAttributes = (attrs: Readonly<Record<string, unknown>> | undefined): Pick<DocumentNodeDraft, 'attrs'> =>
  attrs === undefined ? {} : { attrs };

const describeRow = (row: ParsedRow): string => `Block ${row.id} (${row.content.type})`;

const areLayersWithinChildren = (markers: BlockFormatMarkers, childCount: number): boolean => {
  const starts = (markers.nested ?? []).map((layer) => layer.from);
  return starts.every((start, index) => start <= childCount && start >= (starts[index - 1] ?? 0));
};

const readRow = (row: BlockDocumentRow): Built<ParsedRow> => {
  const content = parseBlockContent(row.type, row.properties, row.format);
  if (content.isFail()) {
    const issues = content
      .getError()
      .issues.map((issue) => `${issue.field}: ${issue.message}`)
      .join('; ');
    return failBlockDocument(
      BLOCK_DOCUMENT_ERROR_CODE.invalidBlock,
      `Block ${row.id} (${row.type}) is not valid: ${issues}`,
    );
  }
  const markers = blockFormatMarkersSchema.safeParse(content.getValue().format);
  if (!markers.success) {
    return failBlockDocument(
      BLOCK_DOCUMENT_ERROR_CODE.invalidBlock,
      `Block ${row.id} has an invalid format: ${markers.error.message}`,
    );
  }
  if (!areLayersWithinChildren(markers.data, row.children.length)) {
    return failBlockDocument(
      BLOCK_DOCUMENT_ERROR_CODE.brokenTree,
      `Block ${row.id} has nested layers that do not fit its ${String(row.children.length)} children`,
    );
  }
  return Result.ok({
    children: row.children,
    content: content.getValue(),
    id: row.id,
    markers: markers.data,
    parentId: row.parentId,
  });
};

const readOwnChildren = (row: ParsedRow): readonly string[] =>
  row.children.slice(0, row.markers.nested?.[0]?.from ?? row.children.length);

const claimChildren = (
  ids: readonly string[],
  parent: ParsedRow,
  context: BuildContext,
): Built<readonly ParsedRow[]> => {
  const claimed: ParsedRow[] = [];
  for (const id of ids) {
    const child = context.rows.get(id);
    if (child === undefined) {
      return failBlockDocument(
        BLOCK_DOCUMENT_ERROR_CODE.brokenTree,
        `${describeRow(parent)} lists the child ${id}, which is missing`,
      );
    }
    if (context.claimed.has(id)) {
      return failBlockDocument(
        BLOCK_DOCUMENT_ERROR_CODE.brokenTree,
        `The block ${id} is listed as a child more than once`,
      );
    }
    if (child.parentId !== parent.id) {
      return failBlockDocument(
        BLOCK_DOCUMENT_ERROR_CODE.brokenTree,
        `The block ${id} is a child of ${parent.id} but says its parent is ${child.parentId ?? 'nothing'}`,
      );
    }
    context.claimed.add(id);
    claimed.push(child);
  }
  return Result.ok(claimed);
};

const isListItem = (row: ParsedRow): boolean => BLOCK_DOCUMENT_LIST_NODES_BY_BLOCK_TYPE[row.content.type] !== undefined;

const startsNewList = (row: ParsedRow): boolean =>
  row.markers.listWrapper !== undefined || row.markers.start !== undefined;

const continuesList = (previous: ParsedRow, next: ParsedRow): boolean =>
  next.content.type === previous.content.type && !startsNewList(next) && previous.markers.nested === undefined;

const takeUnit = (rows: readonly ParsedRow[], position: number): readonly ParsedRow[] => {
  const first = rows.at(position);
  if (first === undefined) return [];
  if (!isListItem(first)) return [first];
  const unit = [first];
  for (const next of rows.slice(position + 1)) {
    const previous = unit.at(-1);
    if (previous === undefined || !continuesList(previous, next)) break;
    unit.push(next);
  }
  return unit;
};

const readItemTitle = (content: BlockContent): BlockRichText | undefined => {
  switch (content.type) {
    case BLOCK_TYPE.bulletedListItem:
    case BLOCK_TYPE.numberedListItem:
    case BLOCK_TYPE.toDo:
      return content.properties.title;
    default:
      return undefined;
  }
};

const buildListItem = (row: ParsedRow, context: BuildContext): Built<DocumentNodeDraft> => {
  const nodes = BLOCK_DOCUMENT_LIST_NODES_BY_BLOCK_TYPE[row.content.type];
  const title = readItemTitle(row.content);
  if (nodes === undefined || title === undefined) {
    return failBlockDocument(BLOCK_DOCUMENT_ERROR_CODE.brokenTree, `${describeRow(row)} is not a list item`);
  }
  const children = buildSiblings(readOwnChildren(row), row, context);
  if (children.isFail()) return forwardFailure(children);
  const line =
    row.markers.line === null
      ? []
      : [
          {
            ...withAttributes(joinWrapperAttributes(row.markers.line)),
            content: richTextToInlineNodes(title),
            type: BLOCK_DOCUMENT_NODE.paragraph,
          },
        ];
  return Result.ok({
    attrs: joinAttributes(nodes.itemNode, row.id, row.content.properties, row.content.format),
    content: [...line, ...children.getValue()],
    type: nodes.itemNode,
  });
};

const buildListWrapper = (unit: readonly ParsedRow[], context: BuildContext): Built<DocumentNodeDraft> => {
  const first = unit.at(0);
  const nodes = first === undefined ? undefined : BLOCK_DOCUMENT_LIST_NODES_BY_BLOCK_TYPE[first.content.type];
  if (first === undefined || nodes === undefined) {
    return failBlockDocument(BLOCK_DOCUMENT_ERROR_CODE.brokenTree, 'A list has no items');
  }
  const items: DocumentNodeDraft[] = [];
  for (const row of unit) {
    const item = buildListItem(row, context);
    if (item.isFail()) return item;
    items.push(item.getValue());
  }
  const order = first.markers.start === undefined ? {} : { order: first.markers.start };
  const attrs = { ...joinWrapperAttributes(first.markers.listWrapper), ...order };
  return Result.ok({
    ...withAttributes(Object.keys(attrs).length === 0 ? undefined : attrs),
    content: items,
    type: nodes.wrapperNode,
  });
};

const readSummary = (row: ParsedRow, title: BlockRichText): Built<string> => {
  const isPlain = title.every((segment) => typeof segment.insert === 'string' && !('attributes' in segment));
  if (!isPlain) {
    return failBlockDocument(
      BLOCK_DOCUMENT_ERROR_CODE.unsupportedText,
      `${describeRow(row)} has a title with marks or embeds, which a toggle summary cannot hold`,
    );
  }
  return Result.ok(title.map((segment) => (typeof segment.insert === 'string' ? segment.insert : '')).join(''));
};

const readNodeType = (content: BlockContent): string | undefined => {
  if (content.type === BLOCK_TYPE.tableCell) {
    return content.properties.isHeader === true ? BLOCK_DOCUMENT_NODE.tableHeader : BLOCK_DOCUMENT_NODE.tableCell;
  }
  return BLOCK_DOCUMENT_NODE_BY_BLOCK_TYPE[content.type];
};

const buildContainedBlock = (row: ParsedRow, nodeType: string, context: BuildContext): Built<DocumentNodeDraft> => {
  const attrs = joinAttributes(nodeType, row.id, row.content.properties, row.content.format);
  const ownChildren = readOwnChildren(row);
  if (!BLOCK_DOCUMENT_CONTAINER_BLOCK_TYPES.includes(row.content.type)) {
    return ownChildren.length === 0
      ? Result.ok({ attrs, type: nodeType })
      : failBlockDocument(
          BLOCK_DOCUMENT_ERROR_CODE.brokenTree,
          `${describeRow(row)} cannot hold children in a page document`,
        );
  }
  const children = buildSiblings(ownChildren, row, context);
  if (children.isFail()) return forwardFailure(children);
  return Result.ok({ attrs, content: children.getValue(), type: nodeType });
};

const buildBlock = (row: ParsedRow, context: BuildContext): Built<DocumentNodeDraft> => {
  const { content } = row;
  switch (content.type) {
    case BLOCK_TYPE.unsupported:
      return Result.ok(content.properties.node);
    case BLOCK_TYPE.paragraph:
    case BLOCK_TYPE.heading:
      return Result.ok({
        attrs: joinAttributes(content.type, row.id, content.properties, content.format),
        content: richTextToInlineNodes(content.properties.title),
        type: content.type,
      });
    case BLOCK_TYPE.codeBlock:
      return Result.ok({
        attrs: joinAttributes(content.type, row.id, content.properties, content.format),
        content: plainTextToTextNodes(content.properties.title),
        type: content.type,
      });
    case BLOCK_TYPE.toggle:
      return buildToggle(row, content.properties.title, context);
    default: {
      const nodeType = readNodeType(content);
      return nodeType === undefined
        ? failBlockDocument(BLOCK_DOCUMENT_ERROR_CODE.brokenTree, `${describeRow(row)} has no place in a page document`)
        : buildContainedBlock(row, nodeType, context);
    }
  }
};

const buildToggle = (row: ParsedRow, title: BlockRichText, context: BuildContext): Built<DocumentNodeDraft> => {
  const summary = readSummary(row, title);
  if (summary.isFail()) return forwardFailure(summary);
  const children = buildSiblings(readOwnChildren(row), row, context);
  if (children.isFail()) return forwardFailure(children);
  const attrs = joinAttributes('toggle', row.id, row.content.properties, row.content.format);
  return Result.ok({ attrs: { ...attrs, summary: summary.getValue() }, content: children.getValue(), type: 'toggle' });
};

const wrapInNestedBlocks = (
  node: DocumentNodeDraft,
  host: ParsedRow,
  context: BuildContext,
): Built<DocumentNodeDraft> => {
  const layers = host.markers.nested ?? [];
  let current = node;
  for (const [index, layer] of layers.entries()) {
    const until = layers[index + 1]?.from ?? host.children.length;
    const children = buildSiblings(host.children.slice(layer.from, until), host, context);
    if (children.isFail()) return forwardFailure(children);
    const blockChildren = {
      ...withAttributes(joinWrapperAttributes(layer.childrenAttrs)),
      content: children.getValue(),
      type: BLOCK_DOCUMENT_NODE.blockChildren,
    };
    current = {
      ...withAttributes(joinWrapperAttributes(layer.attrs)),
      content: [current, blockChildren],
      type: BLOCK_DOCUMENT_NODE.nestedBlock,
    };
  }
  return Result.ok(current);
};

const buildUnit = (unit: readonly ParsedRow[], context: BuildContext): Built<DocumentNodeDraft> => {
  const first = unit.at(0);
  const host = unit.at(-1);
  if (first === undefined || host === undefined) {
    return failBlockDocument(BLOCK_DOCUMENT_ERROR_CODE.brokenTree, 'A group of blocks is empty');
  }
  const node = isListItem(first) ? buildListWrapper(unit, context) : buildBlock(first, context);
  return node.isFail() ? node : wrapInNestedBlocks(node.getValue(), host, context);
};

const buildSiblings = (
  ids: readonly string[],
  parent: ParsedRow,
  context: BuildContext,
): Built<readonly DocumentNodeDraft[]> => {
  const rows = claimChildren(ids, parent, context);
  if (rows.isFail()) return forwardFailure(rows);
  const nodes: DocumentNodeDraft[] = [];
  let position = 0;
  while (position < rows.getValue().length) {
    const unit = takeUnit(rows.getValue(), position);
    const node = buildUnit(unit, context);
    if (node.isFail()) return forwardFailure(node);
    nodes.push(node.getValue());
    position += unit.length;
  }
  return Result.ok(nodes);
};

const indexRows = (page: BlockDocumentRow, blocks: readonly BlockDocumentRow[]): Built<Map<string, ParsedRow>> => {
  const rows = new Map<string, ParsedRow>();
  for (const source of [page, ...blocks]) {
    if (rows.has(source.id)) {
      return failBlockDocument(
        BLOCK_DOCUMENT_ERROR_CODE.duplicateBlockId,
        `The id ${source.id} is used by more than one block`,
      );
    }
    const row = readRow(source);
    if (row.isFail()) return forwardFailure(row);
    rows.set(source.id, row.getValue());
  }
  return Result.ok(rows);
};

/**
 * Rebuilds the page document from its page block and every block below it. Consecutive list items of one kind
 * become one list again unless the first item says it starts another. The result is checked against the page schema.
 */
export const blocksToDocument = (
  page: BlockDocumentRow,
  blocks: readonly BlockDocumentRow[],
): Result<PageContent, BlockDocumentError> => {
  const rows = indexRows(page, blocks);
  if (rows.isFail()) return forwardFailure(rows);
  const pageRow = rows.getValue().get(page.id);
  if (pageRow?.content.type !== BLOCK_TYPE.page) {
    return failBlockDocument(BLOCK_DOCUMENT_ERROR_CODE.brokenTree, `The block ${page.id} is not a page`);
  }
  const context: BuildContext = { claimed: new Set([page.id]), rows: rows.getValue() };
  const nodes = buildSiblings(pageRow.children, pageRow, context);
  if (nodes.isFail()) return forwardFailure(nodes);
  if (context.claimed.size !== rows.getValue().size) {
    return failBlockDocument(BLOCK_DOCUMENT_ERROR_CODE.brokenTree, 'Some blocks are not reachable from the page');
  }
  const document = pageContentSchema.safeParse({
    content: nodes.getValue(),
    schemaVersion: PAGE_CONTENT_SCHEMA_VERSION,
    type: 'doc',
  });
  if (document.success) return Result.ok(document.data);
  return failBlockDocument(
    BLOCK_DOCUMENT_ERROR_CODE.invalidDocument,
    `The rebuilt document is not valid: ${document.error.message}`,
  );
};
