import { isAllowedPageEmbedUrl, PAGE_EMBED_PROVIDERS } from '@company-brain/shared';
import type { DOMOutputSpec, Node as EditorNode, NodeSpec } from 'prosemirror-model';
import { Schema } from 'prosemirror-model';
import { PAGE_EDITOR_BLOCK_CHILDREN_CLASS } from '../constants/pages.constants';

const getPageEditorAssetAttrs = (element: Element): Record<string, string | null> | false => {
  const assetId = element.getAttribute('data-asset-id');
  if (assetId === null) return false;
  return {
    alt: element.getAttribute('alt'),
    assetId,
    caption: element.getAttribute('data-caption'),
  };
};

const getPageEditorEmbedAttrs = (element: Element): { readonly provider: string; readonly url: string } | false => {
  const provider = element.getAttribute('data-page-embed');
  const url = element.getAttribute('data-url');
  const knownProvider = PAGE_EMBED_PROVIDERS.find((entry) => entry === provider);
  if (knownProvider === undefined || url === null || !isAllowedPageEmbedUrl(knownProvider, url)) return false;
  return { provider: knownProvider, url };
};

const getPageEditorToggleAttrs = (element: Element): { readonly summary: string } | false => {
  const summary = element.querySelector('summary')?.textContent;
  if (summary === null || summary === undefined || summary.length === 0) return false;
  return { summary };
};

const getPageEditorMentionAttrs = (
  element: Element,
): { readonly label: string; readonly pageId: string; readonly spaceId: string } | false => {
  const pageId = element.getAttribute('data-page-mention');
  const label = element.getAttribute('data-label');
  const spaceId = element.getAttribute('data-space-id');
  if (pageId === null || label === null || label.length === 0 || spaceId === null) return false;
  return { label, pageId, spaceId };
};

const getPageEditorCollectionAttrs = (
  element: Element,
): { readonly pageId: string; readonly spaceId: string; readonly viewName: string | null } | false => {
  const pageId = element.getAttribute('data-page-collection');
  const spaceId = element.getAttribute('data-space-id');
  if (pageId === null || pageId.length === 0 || spaceId === null || spaceId.length === 0) return false;
  const viewName = element.getAttribute('data-view-name');
  return { pageId, spaceId, viewName: viewName === null || viewName.length === 0 ? null : viewName };
};

const optionalBlockIdAttribute = { default: null };

const toBlockDomAttributes = (node: EditorNode): Record<string, string> =>
  typeof node.attrs.id === 'string' ? { 'data-block-id': node.attrs.id } : {};

const getPageEditorBlockAttrs = (element: Element): { readonly id: string | null } => ({
  id: element.getAttribute('data-block-id'),
});

const pageEditorNodeEntries: readonly (readonly [string, NodeSpec])[] = [
  ['doc', { content: 'block+' }],
  [
    'paragraph',
    {
      attrs: { id: optionalBlockIdAttribute },
      content: 'inline*',
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorBlockAttrs, tag: 'p' }],
      toDOM: (node: EditorNode) => ['p', toBlockDomAttributes(node), 0],
    },
  ],
  ['text', { group: 'inline' }],
  [
    'collection',
    {
      attrs: { id: optionalBlockIdAttribute, pageId: {}, spaceId: {}, viewName: { default: null } },
      atom: true,
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorCollectionAttrs, tag: 'div[data-page-collection]' }],
      toDOM: (node: EditorNode) => [
        'div',
        {
          ...toBlockDomAttributes(node),
          'data-page-collection': node.attrs.pageId,
          'data-space-id': node.attrs.spaceId,
          'data-view-name': node.attrs.viewName ?? '',
        },
      ],
    },
  ],
  [
    'blockquote',
    {
      attrs: { id: optionalBlockIdAttribute },
      content: 'block+',
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorBlockAttrs, tag: 'blockquote' }],
      toDOM: (node: EditorNode) => ['blockquote', toBlockDomAttributes(node), 0],
    },
  ],
  [
    'bullet_list',
    {
      attrs: { id: optionalBlockIdAttribute },
      content: 'list_item+',
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorBlockAttrs, tag: 'ul' }],
      toDOM: (node: EditorNode) => ['ul', toBlockDomAttributes(node), 0],
    },
  ],
  [
    'code_block',
    {
      attrs: { id: optionalBlockIdAttribute },
      code: true,
      content: 'text*',
      group: 'block',
      marks: '',
      parseDOM: [{ getAttrs: getPageEditorBlockAttrs, preserveWhitespace: 'full', tag: 'pre' }],
      toDOM: (node: EditorNode) => ['pre', toBlockDomAttributes(node), ['code', 0]],
    },
  ],
  [
    'embed',
    {
      attrs: { id: optionalBlockIdAttribute, provider: {}, url: {} },
      atom: true,
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorEmbedAttrs, tag: 'div[data-page-embed]' }],
      toDOM: (node: EditorNode) => [
        'div',
        { ...toBlockDomAttributes(node), 'data-page-embed': node.attrs.provider, 'data-url': node.attrs.url },
      ],
    },
  ],
  [
    'file',
    {
      attrs: { alt: { default: null }, assetId: {}, caption: { default: null }, id: optionalBlockIdAttribute },
      atom: true,
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorAssetAttrs, tag: 'div[data-page-file]' }],
      toDOM: (node: EditorNode) => [
        'div',
        {
          ...toBlockDomAttributes(node),
          'data-page-file': true,
          'data-asset-id': node.attrs.assetId,
          'data-caption': node.attrs.caption ?? '',
        },
      ],
    },
  ],
  [
    'heading',
    {
      attrs: { id: optionalBlockIdAttribute, level: { default: 1 } },
      content: 'inline*',
      defining: true,
      group: 'block',
      parseDOM: [
        { attrs: { level: 1 }, tag: 'h1' },
        { attrs: { level: 2 }, tag: 'h2' },
        { attrs: { level: 3 }, tag: 'h3' },
      ],
      toDOM: (node: EditorNode) => [`h${node.attrs.level}`, toBlockDomAttributes(node), 0],
    },
  ],
  [
    'image',
    {
      attrs: { alt: { default: null }, assetId: {}, caption: { default: null }, id: optionalBlockIdAttribute },
      atom: true,
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorAssetAttrs, tag: 'img[data-page-image]' }],
      toDOM: (node: EditorNode) => [
        'img',
        {
          ...toBlockDomAttributes(node),
          'data-asset-id': node.attrs.assetId,
          'data-page-image': true,
          alt: node.attrs.alt ?? '',
        },
      ],
    },
  ],
  [
    'list_item',
    {
      attrs: { id: optionalBlockIdAttribute },
      content: 'paragraph block*',
      defining: true,
      parseDOM: [{ getAttrs: getPageEditorBlockAttrs, tag: 'li' }],
      toDOM: (node: EditorNode) => ['li', toBlockDomAttributes(node), 0],
    },
  ],
  [
    'mention',
    {
      attrs: { label: {}, pageId: {}, spaceId: {} },
      atom: true,
      group: 'inline',
      inline: true,
      parseDOM: [{ getAttrs: getPageEditorMentionAttrs, tag: 'span[data-page-mention]' }],
      toDOM: (node: EditorNode): DOMOutputSpec => [
        'span',
        { 'data-label': node.attrs.label, 'data-page-mention': node.attrs.pageId, 'data-space-id': node.attrs.spaceId },
        `@${node.attrs.label}`,
      ],
    },
  ],
  [
    'ordered_list',
    {
      attrs: { id: optionalBlockIdAttribute, order: { default: 1 } },
      content: 'list_item+',
      group: 'block',
      parseDOM: [
        { getAttrs: (element: Element) => ({ order: Number(element.getAttribute('start')) || 1 }), tag: 'ol' },
      ],
      toDOM: (node: EditorNode) => [
        'ol',
        node.attrs.order === 1
          ? toBlockDomAttributes(node)
          : { ...toBlockDomAttributes(node), start: node.attrs.order },
        0,
      ],
    },
  ],
  [
    'table',
    {
      attrs: { id: optionalBlockIdAttribute },
      content: 'table_row+',
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorBlockAttrs, tag: 'table' }],
      toDOM: (node: EditorNode) => ['table', toBlockDomAttributes(node), ['tbody', 0]],
    },
  ],
  [
    'table_cell',
    {
      attrs: { id: optionalBlockIdAttribute },
      content: 'block+',
      parseDOM: [{ getAttrs: getPageEditorBlockAttrs, tag: 'td' }],
      toDOM: (node: EditorNode) => ['td', toBlockDomAttributes(node), 0],
    },
  ],
  [
    'table_row',
    {
      attrs: { id: optionalBlockIdAttribute },
      content: 'table_cell+',
      parseDOM: [{ getAttrs: getPageEditorBlockAttrs, tag: 'tr' }],
      toDOM: (node: EditorNode) => ['tr', toBlockDomAttributes(node), 0],
    },
  ],
  [
    'toggle',
    {
      attrs: { id: optionalBlockIdAttribute, summary: {} },
      content: 'block+',
      defining: true,
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorToggleAttrs, tag: 'details[data-page-toggle]' }],
      toDOM: (node: EditorNode): DOMOutputSpec => [
        'details',
        { ...toBlockDomAttributes(node), 'data-page-toggle': true },
        ['summary', node.attrs.summary],
        ['div', 0],
      ],
    },
  ],
  [
    'block_children',
    {
      attrs: { id: optionalBlockIdAttribute },
      content: 'block+',
      parseDOM: [{ getAttrs: getPageEditorBlockAttrs, tag: 'div[data-block-children]' }],
      toDOM: (node: EditorNode) => [
        'div',
        { ...toBlockDomAttributes(node), 'data-block-children': 'true', class: PAGE_EDITOR_BLOCK_CHILDREN_CLASS },
        0,
      ],
    },
  ],
  [
    'nested_block',
    {
      attrs: { id: optionalBlockIdAttribute },
      content: 'block block_children',
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorBlockAttrs, tag: 'div[data-nested-block]' }],
      toDOM: (node: EditorNode) => ['div', { ...toBlockDomAttributes(node), 'data-nested-block': 'true' }, 0],
    },
  ],
];

const pageEditorNodes: Readonly<Record<string, NodeSpec>> = Object.fromEntries(pageEditorNodeEntries);
const pageEditorLinkProtocols = new Set(['http:', 'https:', 'mailto:']);

const getPageEditorLinkAttrs = (element: Element): { readonly href: string } | false => {
  const href = element.getAttribute('href');
  if (href === null || !URL.canParse(href)) return false;

  const protocol = new URL(href).protocol;
  if (!pageEditorLinkProtocols.has(protocol)) return false;
  return { href };
};

export const pageEditorSchema = new Schema({
  marks: {
    code: { toDOM: (): DOMOutputSpec => ['code', 0] },
    em: { toDOM: (): DOMOutputSpec => ['em', 0] },
    link: {
      attrs: { href: {} },
      inclusive: false,
      parseDOM: [{ getAttrs: getPageEditorLinkAttrs, tag: 'a[href]' }],
      toDOM: (mark) => ['a', { href: mark.attrs.href }, 0],
    },
    strong: { toDOM: (): DOMOutputSpec => ['strong', 0] },
  },
  nodes: pageEditorNodes,
});
