import type {
  PageDocumentAttributes,
  PageDocumentMarkStructure,
  PageDocumentNodeStructure,
} from './page-document.types.js';

const OPTIONAL: PageDocumentAttributes[string] = { default: null };
const REQUIRED: PageDocumentAttributes[string] = {};

/** Lo que lleva todo bloque, sea del tipo que sea: quién es, cómo se pinta y qué se dijo de él. */
const PAGE_DOCUMENT_BLOCK_ATTRIBUTES: PageDocumentAttributes = {
  backgroundColor: OPTIONAL,
  comments: OPTIONAL,
  id: OPTIONAL,
  textColor: OPTIONAL,
};

const withBlockAttributes = (attrs: PageDocumentAttributes = {}): PageDocumentAttributes => ({
  ...attrs,
  ...PAGE_DOCUMENT_BLOCK_ATTRIBUTES,
});

const PAGE_DOCUMENT_FRAMED_ASSET_ATTRIBUTES: PageDocumentAttributes = {
  align: OPTIONAL,
  alt: OPTIONAL,
  assetId: REQUIRED,
  caption: OPTIONAL,
  width: OPTIONAL,
};

const PAGE_DOCUMENT_TABLE_CELL_ATTRIBUTES: PageDocumentAttributes = {
  colspan: { default: 1 },
  colwidth: OPTIONAL,
  rowspan: { default: 1 },
};

/** El nombre del bloque que escribió una versión que sabe más que esta, y que se guarda tal cual. */
export const PAGE_DOCUMENT_UNSUPPORTED_NODE = 'unsupported';

/**
 * La forma del documento de una página, igual para el editor y para el
 * servidor. El orden importa: el primer bloque es el que se crea por defecto, y
 * el orden de las marcas es el orden en que se escriben.
 */
export const PAGE_DOCUMENT_NODES = {
  doc: { content: 'block+' },
  paragraph: { attrs: withBlockAttributes(), content: 'inline*', group: 'block' },
  text: { group: 'inline' },
  hard_break: { group: 'inline', inline: true },
  collection: {
    attrs: withBlockAttributes({ pageId: REQUIRED, spaceId: REQUIRED, viewName: OPTIONAL }),
    group: 'block',
  },
  blockquote: { attrs: withBlockAttributes(), content: 'block+', group: 'block' },
  bullet_list: { attrs: withBlockAttributes(), content: 'list_item+', group: 'block' },
  code_block: {
    attrs: withBlockAttributes({ language: OPTIONAL, shown: OPTIONAL, wrapped: { default: false } }),
    content: 'text*',
    group: 'block',
    marks: '',
  },
  video: { attrs: withBlockAttributes(PAGE_DOCUMENT_FRAMED_ASSET_ATTRIBUTES), group: 'block' },
  audio: { attrs: withBlockAttributes(PAGE_DOCUMENT_FRAMED_ASSET_ATTRIBUTES), group: 'block' },
  divider: { attrs: withBlockAttributes(), group: 'block' },
  table_of_contents: { attrs: withBlockAttributes(), group: 'block' },
  button: {
    attrs: withBlockAttributes({
      deed: OPTIONAL,
      label: REQUIRED,
      pageId: OPTIONAL,
      place: OPTIONAL,
      spaceId: OPTIONAL,
    }),
    content: 'block+',
    group: 'block',
  },
  synced: { attrs: withBlockAttributes({ blockId: REQUIRED, pageId: REQUIRED, spaceId: REQUIRED }), group: 'block' },
  subpage: { attrs: withBlockAttributes({ label: REQUIRED, pageId: REQUIRED, spaceId: REQUIRED }), group: 'block' },
  bookmark: {
    attrs: withBlockAttributes({ description: OPTIONAL, icon: OPTIONAL, title: OPTIONAL, url: REQUIRED }),
    group: 'block',
  },
  embed: {
    attrs: withBlockAttributes({ align: OPTIONAL, provider: REQUIRED, url: REQUIRED, width: OPTIONAL }),
    group: 'block',
  },
  file: {
    attrs: withBlockAttributes({
      ...PAGE_DOCUMENT_FRAMED_ASSET_ATTRIBUTES,
      display: OPTIONAL,
      mimeType: OPTIONAL,
      size: OPTIONAL,
    }),
    group: 'block',
  },
  heading: {
    attrs: withBlockAttributes({ collapsed: { default: false }, level: { default: 1 } }),
    content: 'inline*',
    group: 'block',
  },
  image: { attrs: withBlockAttributes(PAGE_DOCUMENT_FRAMED_ASSET_ATTRIBUTES), group: 'block' },
  list_item: { attrs: withBlockAttributes(), content: 'paragraph block*' },
  task_list: { attrs: withBlockAttributes(), content: 'task_item+', group: 'block' },
  task_item: { attrs: withBlockAttributes({ checked: { default: false } }), content: 'paragraph block*' },
  callout: { attrs: withBlockAttributes({ icon: OPTIONAL }), content: 'block+', group: 'block' },
  mention: { attrs: { label: REQUIRED, pageId: REQUIRED, spaceId: REQUIRED }, group: 'inline', inline: true },
  person: { attrs: { label: REQUIRED, userId: REQUIRED }, group: 'inline', inline: true },
  date: { attrs: { at: REQUIRED }, group: 'inline', inline: true },
  formula: { attrs: { latex: { default: '' } }, group: 'inline', inline: true },
  ordered_list: { attrs: withBlockAttributes({ order: { default: 1 } }), content: 'list_item+', group: 'block' },
  table: { attrs: withBlockAttributes(), content: 'table_row+', group: 'block' },
  table_cell: { attrs: withBlockAttributes(PAGE_DOCUMENT_TABLE_CELL_ATTRIBUTES), content: 'block+' },
  table_header: { attrs: withBlockAttributes(PAGE_DOCUMENT_TABLE_CELL_ATTRIBUTES), content: 'block+' },
  table_row: { attrs: withBlockAttributes(), content: '(table_cell | table_header)+' },
  toggle: {
    attrs: withBlockAttributes({ open: { default: false }, summary: REQUIRED }),
    content: 'block+',
    group: 'block',
  },
  column_list: { attrs: withBlockAttributes(), content: 'column+', group: 'block' },
  column: { attrs: withBlockAttributes({ width: OPTIONAL }), content: 'block+' },
  block_children: { attrs: withBlockAttributes(), content: 'block+' },
  [PAGE_DOCUMENT_UNSUPPORTED_NODE]: {
    attrs: withBlockAttributes({ name: REQUIRED, source: REQUIRED }),
    group: 'block',
  },
  nested_block: { attrs: withBlockAttributes(), content: 'block block_children', group: 'block' },
} as const satisfies Readonly<Record<string, PageDocumentNodeStructure>>;

export const PAGE_DOCUMENT_MARKS = {
  code: {},
  comment: { attrs: { id: REQUIRED }, inclusive: false },
  em: {},
  link: { attrs: { href: REQUIRED }, inclusive: false },
  background_color: { attrs: { color: REQUIRED } },
  strike: {},
  strong: {},
  text_color: { attrs: { color: REQUIRED } },
  underline: {},
} as const satisfies Readonly<Record<string, PageDocumentMarkStructure>>;
