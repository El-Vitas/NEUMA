import { isAllowedPageEmbedUrl, PAGE_EMBED_PROVIDERS } from '@company-brain/shared';
import type { DOMOutputSpec, Node as EditorNode, NodeSpec } from 'prosemirror-model';
import { Schema } from 'prosemirror-model';

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

const pageEditorNodeEntries: readonly (readonly [string, NodeSpec])[] = [
  [
    'blockquote',
    { content: 'block+', group: 'block', parseDOM: [{ tag: 'blockquote' }], toDOM: () => ['blockquote', 0] },
  ],
  ['bullet_list', { content: 'list_item+', group: 'block', parseDOM: [{ tag: 'ul' }], toDOM: () => ['ul', 0] }],
  [
    'code_block',
    {
      code: true,
      content: 'text*',
      group: 'block',
      marks: '',
      parseDOM: [{ preserveWhitespace: 'full', tag: 'pre' }],
      toDOM: () => ['pre', ['code', 0]],
    },
  ],
  [
    'embed',
    {
      attrs: { provider: {}, url: {} },
      atom: true,
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorEmbedAttrs, tag: 'div[data-page-embed]' }],
      toDOM: (node: EditorNode) => ['div', { 'data-page-embed': node.attrs.provider, 'data-url': node.attrs.url }],
    },
  ],
  [
    'file',
    {
      attrs: { alt: { default: null }, assetId: {}, caption: { default: null } },
      atom: true,
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorAssetAttrs, tag: 'div[data-page-file]' }],
      toDOM: (node: EditorNode) => [
        'div',
        { 'data-page-file': true, 'data-asset-id': node.attrs.assetId, 'data-caption': node.attrs.caption ?? '' },
      ],
    },
  ],
  ['doc', { content: 'block+' }],
  [
    'heading',
    {
      attrs: { level: { default: 1 } },
      content: 'inline*',
      defining: true,
      group: 'block',
      parseDOM: [
        { attrs: { level: 1 }, tag: 'h1' },
        { attrs: { level: 2 }, tag: 'h2' },
        { attrs: { level: 3 }, tag: 'h3' },
      ],
      toDOM: (node: EditorNode) => [`h${node.attrs.level}`, 0],
    },
  ],
  [
    'image',
    {
      attrs: { alt: { default: null }, assetId: {}, caption: { default: null } },
      atom: true,
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorAssetAttrs, tag: 'img[data-page-image]' }],
      toDOM: (node: EditorNode) => [
        'img',
        { 'data-asset-id': node.attrs.assetId, 'data-page-image': true, alt: node.attrs.alt ?? '' },
      ],
    },
  ],
  ['list_item', { content: 'paragraph block*', defining: true, parseDOM: [{ tag: 'li' }], toDOM: () => ['li', 0] }],
  [
    'ordered_list',
    {
      attrs: { order: { default: 1 } },
      content: 'list_item+',
      group: 'block',
      parseDOM: [
        { getAttrs: (element: Element) => ({ order: Number(element.getAttribute('start')) || 1 }), tag: 'ol' },
      ],
      toDOM: (node: EditorNode) => ['ol', node.attrs.order === 1 ? {} : { start: node.attrs.order }, 0],
    },
  ],
  ['paragraph', { content: 'inline*', group: 'block', parseDOM: [{ tag: 'p' }], toDOM: () => ['p', 0] }],
  ['text', { group: 'inline' }],
  [
    'table',
    { content: 'table_row+', group: 'block', parseDOM: [{ tag: 'table' }], toDOM: () => ['table', ['tbody', 0]] },
  ],
  ['table_cell', { content: 'block+', parseDOM: [{ tag: 'td' }], toDOM: () => ['td', 0] }],
  ['table_row', { content: 'table_cell+', parseDOM: [{ tag: 'tr' }], toDOM: () => ['tr', 0] }],
  [
    'toggle',
    {
      attrs: { summary: {} },
      content: 'block+',
      defining: true,
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorToggleAttrs, tag: 'details[data-page-toggle]' }],
      toDOM: (node: EditorNode): DOMOutputSpec => [
        'details',
        { 'data-page-toggle': true },
        ['summary', node.attrs.summary],
        ['div', 0],
      ],
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
