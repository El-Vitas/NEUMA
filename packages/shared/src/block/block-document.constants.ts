import type { BlockType } from './block-content.types.js';
import { BLOCK_TYPE } from './block-type.constants.js';

export const BLOCK_DOCUMENT_ERROR_CODE = {
  brokenTree: 'broken_tree',
  duplicateBlockId: 'duplicate_block_id',
  invalidBlock: 'invalid_block',
  invalidDocument: 'invalid_document',
  unsupportedText: 'unsupported_text',
} as const;

export const BLOCK_DOCUMENT_ID_ATTRIBUTE = 'id';

/** The attributes every document node can carry besides its id; they live in the block format. */
export const BLOCK_DOCUMENT_ANNOTATION_KEYS = ['backgroundColor', 'textColor'] as const;

/** Comments were once an attribute of the node. They are discussions now (ADR 023), so they are read past. */
export const BLOCK_DOCUMENT_LEGACY_COMMENTS_ATTRIBUTE = 'comments';

export const BLOCK_DOCUMENT_ORDER_ATTRIBUTE = 'order';
export const BLOCK_DOCUMENT_SUMMARY_ATTRIBUTE = 'summary';
export const BLOCK_DOCUMENT_START_FORMAT = 'start';

export const BLOCK_DOCUMENT_NODE = {
  blockChildren: 'block_children',
  bulletList: 'bullet_list',
  listItem: 'list_item',
  nestedBlock: 'nested_block',
  orderedList: 'ordered_list',
  paragraph: 'paragraph',
  tableCell: 'table_cell',
  tableHeader: 'table_header',
  taskItem: 'task_item',
  taskList: 'task_list',
} as const;

interface AttributeRoute {
  readonly format: readonly string[];
  readonly properties: readonly string[];
}

const NO_ATTRIBUTES: AttributeRoute = { format: [], properties: [] };
const ASSET_ATTRIBUTES: AttributeRoute = { format: ['align', 'width'], properties: ['alt', 'assetId', 'caption'] };
const TABLE_CELL_ATTRIBUTES: AttributeRoute = { format: ['colwidth'], properties: ['colspan', 'rowspan'] };

/** Where each attribute of a document node goes in the block: its properties or its format. */
export const BLOCK_DOCUMENT_ATTRIBUTE_ROUTES: Readonly<Partial<Record<string, AttributeRoute>>> = {
  audio: ASSET_ATTRIBUTES,
  blockquote: NO_ATTRIBUTES,
  bookmark: { format: [], properties: ['description', 'icon', 'title', 'url'] },
  button: { format: [], properties: ['deed', 'label', 'pageId', 'place', 'spaceId', 'templateId'] },
  callout: { format: ['icon'], properties: [] },
  code_block: { format: ['frameHeight', 'shown', 'wrapped'], properties: ['language'] },
  collection: { format: [], properties: ['pageId', 'spaceId', 'viewName'] },
  column: { format: ['width'], properties: [] },
  column_list: NO_ATTRIBUTES,
  divider: NO_ATTRIBUTES,
  embed: { format: ['align', 'width'], properties: ['provider', 'url'] },
  file: { format: ['align', 'display', 'width'], properties: ['alt', 'assetId', 'caption', 'mimeType', 'size'] },
  heading: { format: ['collapsed'], properties: ['level'] },
  image: ASSET_ATTRIBUTES,
  list_item: NO_ATTRIBUTES,
  paragraph: NO_ATTRIBUTES,
  subpage: { format: [], properties: ['label', 'pageId', 'spaceId'] },
  synced: { format: [], properties: ['blockId', 'pageId', 'spaceId'] },
  table: NO_ATTRIBUTES,
  table_cell: TABLE_CELL_ATTRIBUTES,
  table_header: TABLE_CELL_ATTRIBUTES,
  table_of_contents: NO_ATTRIBUTES,
  table_row: NO_ATTRIBUTES,
  task_item: { format: [], properties: ['checked'] },
  toggle: { format: ['open'], properties: [] },
  video: ASSET_ATTRIBUTES,
};

/** The wrappers the document uses for lists, with the block type their items become. */
export const BLOCK_DOCUMENT_LIST_KINDS: Readonly<
  Partial<Record<string, { readonly itemNode: string; readonly blockType: BlockType }>>
> = {
  bullet_list: { blockType: BLOCK_TYPE.bulletedListItem, itemNode: BLOCK_DOCUMENT_NODE.listItem },
  ordered_list: { blockType: BLOCK_TYPE.numberedListItem, itemNode: BLOCK_DOCUMENT_NODE.listItem },
  task_list: { blockType: BLOCK_TYPE.toDo, itemNode: BLOCK_DOCUMENT_NODE.taskItem },
};

export const BLOCK_DOCUMENT_LIST_NODES_BY_BLOCK_TYPE: Readonly<
  Partial<Record<BlockType, { readonly itemNode: string; readonly wrapperNode: string }>>
> = {
  [BLOCK_TYPE.bulletedListItem]: {
    itemNode: BLOCK_DOCUMENT_NODE.listItem,
    wrapperNode: BLOCK_DOCUMENT_NODE.bulletList,
  },
  [BLOCK_TYPE.numberedListItem]: {
    itemNode: BLOCK_DOCUMENT_NODE.listItem,
    wrapperNode: BLOCK_DOCUMENT_NODE.orderedList,
  },
  [BLOCK_TYPE.toDo]: { itemNode: BLOCK_DOCUMENT_NODE.taskItem, wrapperNode: BLOCK_DOCUMENT_NODE.taskList },
};

/** Document nodes that stay one block, by the block type they become; list items and cells are handled apart. */
export const BLOCK_DOCUMENT_BLOCK_TYPE_BY_NODE: Readonly<Partial<Record<string, BlockType>>> = {
  audio: BLOCK_TYPE.audio,
  blockquote: BLOCK_TYPE.blockquote,
  bookmark: BLOCK_TYPE.bookmark,
  button: BLOCK_TYPE.button,
  callout: BLOCK_TYPE.callout,
  code_block: BLOCK_TYPE.codeBlock,
  collection: BLOCK_TYPE.collection,
  column: BLOCK_TYPE.column,
  column_list: BLOCK_TYPE.columnList,
  divider: BLOCK_TYPE.divider,
  embed: BLOCK_TYPE.embed,
  file: BLOCK_TYPE.file,
  heading: BLOCK_TYPE.heading,
  image: BLOCK_TYPE.image,
  paragraph: BLOCK_TYPE.paragraph,
  subpage: BLOCK_TYPE.subpage,
  synced: BLOCK_TYPE.synced,
  table: BLOCK_TYPE.table,
  table_cell: BLOCK_TYPE.tableCell,
  table_header: BLOCK_TYPE.tableCell,
  table_of_contents: BLOCK_TYPE.tableOfContents,
  table_row: BLOCK_TYPE.tableRow,
  toggle: BLOCK_TYPE.toggle,
  video: BLOCK_TYPE.video,
};

export const BLOCK_DOCUMENT_NODE_BY_BLOCK_TYPE: Readonly<Partial<Record<BlockType, string>>> = {
  [BLOCK_TYPE.audio]: 'audio',
  [BLOCK_TYPE.blockquote]: 'blockquote',
  [BLOCK_TYPE.bookmark]: 'bookmark',
  [BLOCK_TYPE.button]: 'button',
  [BLOCK_TYPE.callout]: 'callout',
  [BLOCK_TYPE.codeBlock]: 'code_block',
  [BLOCK_TYPE.collection]: 'collection',
  [BLOCK_TYPE.column]: 'column',
  [BLOCK_TYPE.columnList]: 'column_list',
  [BLOCK_TYPE.divider]: 'divider',
  [BLOCK_TYPE.embed]: 'embed',
  [BLOCK_TYPE.file]: 'file',
  [BLOCK_TYPE.heading]: 'heading',
  [BLOCK_TYPE.image]: 'image',
  [BLOCK_TYPE.paragraph]: BLOCK_DOCUMENT_NODE.paragraph,
  [BLOCK_TYPE.subpage]: 'subpage',
  [BLOCK_TYPE.synced]: 'synced',
  [BLOCK_TYPE.table]: 'table',
  [BLOCK_TYPE.tableOfContents]: 'table_of_contents',
  [BLOCK_TYPE.tableRow]: 'table_row',
  [BLOCK_TYPE.toggle]: 'toggle',
  [BLOCK_TYPE.video]: 'video',
};

/** Document nodes whose content is other blocks. */
export const BLOCK_DOCUMENT_CONTAINER_NODES: readonly string[] = [
  'blockquote',
  'button',
  'callout',
  'column',
  'column_list',
  'table',
  'table_cell',
  'table_header',
  'table_row',
  'toggle',
];

/** Block types whose children are the content of a document node. */
export const BLOCK_DOCUMENT_CONTAINER_BLOCK_TYPES: readonly BlockType[] = [
  BLOCK_TYPE.blockquote,
  BLOCK_TYPE.button,
  BLOCK_TYPE.callout,
  BLOCK_TYPE.column,
  BLOCK_TYPE.columnList,
  BLOCK_TYPE.table,
  BLOCK_TYPE.tableCell,
  BLOCK_TYPE.tableRow,
  BLOCK_TYPE.toggle,
];

export const BLOCK_DOCUMENT_ID_PATH_SEPARATOR = '.';
export const BLOCK_DOCUMENT_ID_KEY_SEPARATOR = '\u0000';
