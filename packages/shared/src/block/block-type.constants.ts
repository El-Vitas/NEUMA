import { PAGE_DOCUMENT_UNSUPPORTED_NODE } from '../page-document/page-document.structure.js';

export const BLOCK_TYPE = {
  page: 'page',
  paragraph: 'paragraph',
  heading: 'heading',
  bulletedListItem: 'bulleted_list_item',
  numberedListItem: 'numbered_list_item',
  toDo: 'to_do',
  blockquote: 'blockquote',
  callout: 'callout',
  codeBlock: 'code_block',
  divider: 'divider',
  toggle: 'toggle',
  image: 'image',
  video: 'video',
  audio: 'audio',
  file: 'file',
  bookmark: 'bookmark',
  embed: 'embed',
  button: 'button',
  tableOfContents: 'table_of_contents',
  synced: 'synced',
  subpage: 'subpage',
  collection: 'collection',
  table: 'table',
  tableRow: 'table_row',
  tableCell: 'table_cell',
  columnList: 'column_list',
  column: 'column',
  unsupported: PAGE_DOCUMENT_UNSUPPORTED_NODE,
} as const;

export const BLOCK_TYPE_VALUES = Object.values(BLOCK_TYPE);

export const BLOCK_TEXT_MARK = {
  strong: 'strong',
  em: 'em',
  strike: 'strike',
  underline: 'underline',
  code: 'code',
  link: 'link',
  textColor: 'text_color',
  backgroundColor: 'background_color',
  comment: 'comment',
} as const;

export const BLOCK_TEXT_EMBED = {
  mention: 'mention',
  person: 'person',
  date: 'date',
  formula: 'formula',
  hardBreak: 'hard_break',
} as const;

/** A block can host that many stacked nested blocks, matching how deep a page document may go. */
export const BLOCK_NESTED_LAYERS_MOST = 10;

export const BLOCK_CONTENT_ERROR_CODE = {
  unknownType: 'unknown_type',
  invalidContent: 'invalid_content',
} as const;

export const BLOCK_NODE_DISPOSITION_KIND = {
  block: 'block',
  inline: 'inline',
  wrapper: 'wrapper',
} as const;

const asBlock = (...blockTypes: readonly (typeof BLOCK_TYPE_VALUES)[number][]) =>
  ({ kind: BLOCK_NODE_DISPOSITION_KIND.block, blockTypes }) as const;

const asInline = (destination: string) => ({ destination, kind: BLOCK_NODE_DISPOSITION_KIND.inline }) as const;

const asWrapper = (destination: string) => ({ destination, kind: BLOCK_NODE_DISPOSITION_KIND.wrapper }) as const;

/**
 * Where every node of the ProseMirror page document goes. A node absent from this map (written by a newer version)
 * becomes an `unsupported` block that keeps the raw node.
 */
export const BLOCK_NODE_DISPOSITION = {
  doc: asWrapper(
    'The page block itself: its content becomes the page children. schemaVersion is replaced by the per-type schemas.',
  ),
  paragraph: asBlock(BLOCK_TYPE.paragraph),
  heading: asBlock(BLOCK_TYPE.heading),
  bullet_list: asWrapper(
    'Dissolved: each list_item becomes a bulleted_list_item. The wrapper id and colors go to the first item format.listWrapper, which also marks where the list starts.',
  ),
  ordered_list: asWrapper(
    'Dissolved: each list_item becomes a numbered_list_item. Its order goes to the first item format.start; the wrapper id and colors go to its format.listWrapper.',
  ),
  list_item: asBlock(BLOCK_TYPE.bulletedListItem, BLOCK_TYPE.numberedListItem),
  task_list: asWrapper(
    'Dissolved: each task_item becomes a to_do. The wrapper id and colors go to the first item format.listWrapper, which also marks where the list starts.',
  ),
  task_item: asBlock(BLOCK_TYPE.toDo),
  callout: asBlock(BLOCK_TYPE.callout),
  blockquote: asBlock(BLOCK_TYPE.blockquote),
  nested_block: asWrapper(
    'Dissolved: its first child is the block and its block_children become that block children. The wrapper attributes and where its children begin go to the format.nested of the last block of its first child.',
  ),
  block_children: asWrapper(
    'Dissolved: its content becomes the children of the block that precedes it in a nested_block; its own attributes go to that block format.nested.',
  ),
  code_block: asBlock(BLOCK_TYPE.codeBlock),
  table: asBlock(BLOCK_TYPE.table),
  table_row: asBlock(BLOCK_TYPE.tableRow),
  table_cell: asBlock(BLOCK_TYPE.tableCell),
  table_header: asBlock(BLOCK_TYPE.tableCell),
  toggle: asBlock(BLOCK_TYPE.toggle),
  column_list: asBlock(BLOCK_TYPE.columnList),
  column: asBlock(BLOCK_TYPE.column),
  audio: asBlock(BLOCK_TYPE.audio),
  divider: asBlock(BLOCK_TYPE.divider),
  table_of_contents: asBlock(BLOCK_TYPE.tableOfContents),
  subpage: asBlock(BLOCK_TYPE.subpage),
  synced: asBlock(BLOCK_TYPE.synced),
  button: asBlock(BLOCK_TYPE.button),
  image: asBlock(BLOCK_TYPE.image),
  video: asBlock(BLOCK_TYPE.video),
  file: asBlock(BLOCK_TYPE.file),
  bookmark: asBlock(BLOCK_TYPE.bookmark),
  embed: asBlock(BLOCK_TYPE.embed),
  collection: asBlock(BLOCK_TYPE.collection),
  text: asInline('A rich text segment; its marks are the segment attributes.'),
  mention: asInline('An embed segment.'),
  person: asInline('An embed segment.'),
  date: asInline('An embed segment.'),
  formula: asInline('An embed segment.'),
  hard_break: asInline('An embed segment.'),
  [PAGE_DOCUMENT_UNSUPPORTED_NODE]: asBlock(BLOCK_TYPE.unsupported),
} as const;
