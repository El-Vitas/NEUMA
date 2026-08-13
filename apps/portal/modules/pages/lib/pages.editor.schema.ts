import { isAllowedPageEmbedUrl, PAGE_CALLOUT_ICONS, PAGE_EMBED_PROVIDERS } from '@company-brain/shared';
import type { DOMOutputSpec, Node as EditorNode, NodeSpec } from 'prosemirror-model';
import { Schema } from 'prosemirror-model';
import {
  PAGE_EDITOR_BLOCK_CHILDREN_CLASS,
  PAGE_EDITOR_BLOCK_ID_ATTRIBUTE,
  PAGE_EDITOR_CALLOUT_CLASS,
  PAGE_EDITOR_COLUMN_CLASS,
  PAGE_EDITOR_COLUMN_LIST_CLASS,
  PAGE_EDITOR_COMMENT_ID_ATTRIBUTE,
  PAGE_EDITOR_COMMENTED_TEXT_STYLE_CLASS,
  PAGE_EDITOR_TASK_ITEM_STYLE_CLASS,
  PAGE_EDITOR_TASK_LIST_CLASS,
  PAGE_EDITOR_UNSUPPORTED_ATTRIBUTE,
  PAGE_EDITOR_UNSUPPORTED_STYLE_CLASS,
  PAGE_EDITOR_UNSUPPORTED_TYPE,
} from '../constants/pages.editor.blocks.constants';
import { definePageBlock } from './pages.editor.block-spec.lib';

const getPageEditorAssetAttrs = (element: HTMLElement): Record<string, string | null> | false => {
  const assetId = element.dataset.assetId;
  if (assetId === undefined) return false;
  return {
    alt: element.getAttribute('alt'),
    assetId,
    caption: element.dataset.caption ?? null,
  };
};

const getPageEditorEmbedAttrs = (element: HTMLElement): { readonly provider: string; readonly url: string } | false => {
  const { pageEmbed, url } = element.dataset;
  const knownProvider = PAGE_EMBED_PROVIDERS.find((entry) => entry === pageEmbed);
  if (knownProvider === undefined || url === undefined || !isAllowedPageEmbedUrl(knownProvider, url)) return false;
  return { provider: knownProvider, url };
};

const getPageEditorToggleAttrs = (element: Element): { readonly open: boolean; readonly summary: string } | false => {
  const summary = element.querySelector('summary')?.textContent;
  if (summary === null || summary === undefined) return false;
  return { open: element.hasAttribute('open'), summary };
};

/** A mark that is not one of the few on offer is no mark at all. */
const isPageCalloutIcon = (value: string): boolean => PAGE_CALLOUT_ICONS.some((icon) => icon === value);

const getPageEditorCalloutAttrs = (element: Element): { readonly icon: string | null } => {
  const icon = element.getAttribute('data-icon');
  return { icon: icon !== null && isPageCalloutIcon(icon) ? icon : null };
};

const getPageEditorMentionAttrs = (
  element: HTMLElement,
): { readonly label: string; readonly pageId: string; readonly spaceId: string } | false => {
  const { label, pageMention: pageId, spaceId } = element.dataset;
  if (pageId === undefined || label === undefined || label.length === 0 || spaceId === undefined) return false;
  return { label, pageId, spaceId };
};

const getPageEditorCollectionAttrs = (
  element: HTMLElement,
): { readonly pageId: string; readonly spaceId: string; readonly viewName: string | null } | false => {
  const { pageCollection: pageId, spaceId, viewName } = element.dataset;
  if (pageId === undefined || pageId.length === 0 || spaceId === undefined || spaceId.length === 0) return false;
  return { pageId, spaceId, viewName: viewName === undefined || viewName.length === 0 ? null : viewName };
};

const getPageEditorUnsupportedAttrs = (
  element: Element,
): { readonly name: string; readonly source: string } | false => {
  const name = element.getAttribute(PAGE_EDITOR_UNSUPPORTED_ATTRIBUTE);
  return name === null || name.length === 0 ? false : { name, source: JSON.stringify({ type: name }) };
};

const getPageEditorTaskAttrs = (element: HTMLElement): { readonly checked: boolean; readonly id: string | null } => ({
  checked: element.dataset.checked !== undefined,
  id: element.getAttribute(PAGE_EDITOR_BLOCK_ID_ATTRIBUTE),
});

const getPageEditorColumnAttrs = (
  element: HTMLElement,
): { readonly id: string | null; readonly width: number | null } => {
  const width = Number.parseFloat(element.dataset.width ?? '');
  return { id: element.dataset.blockId ?? null, width: Number.isFinite(width) ? width : null };
};

/** A heading carries its level and whether it was left folded, and both must survive a round trip through the DOM. */
const readPageEditorHeadingAttrs =
  (level: number) =>
  (element: HTMLElement): { readonly collapsed: boolean; readonly level: number } => ({
    collapsed: element.dataset.collapsed === 'true',
    level,
  });

const pageEditorNodeEntries: readonly (readonly [string, NodeSpec])[] = [
  ['doc', { content: 'block+' }],
  [
    'paragraph',
    definePageBlock({
      content: 'inline*',
      group: 'block',
      parseDOM: [{ tag: 'p' }],
      render: (_node, blockAttributes) => ['p', blockAttributes, 0],
    }),
  ],
  ['text', { group: 'inline' }],
  [
    'hard_break',
    {
      group: 'inline',
      inline: true,
      parseDOM: [{ tag: 'br' }],
      selectable: false,
      toDOM: () => ['br'],
    },
  ],
  [
    'collection',
    definePageBlock({
      attrs: { pageId: {}, spaceId: {}, viewName: { default: null } },
      atom: true,
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorCollectionAttrs, tag: 'div[data-page-collection]' }],
      render: (node, blockAttributes) => [
        'div',
        {
          ...blockAttributes,
          'data-page-collection': node.attrs.pageId,
          'data-space-id': node.attrs.spaceId,
          'data-view-name': node.attrs.viewName ?? '',
        },
      ],
    }),
  ],
  [
    'blockquote',
    definePageBlock({
      content: 'block+',
      group: 'block',
      parseDOM: [{ tag: 'blockquote' }],
      render: (_node, blockAttributes) => ['blockquote', blockAttributes, 0],
    }),
  ],
  [
    'bullet_list',
    definePageBlock({
      content: 'list_item+',
      group: 'block',
      parseDOM: [{ tag: 'ul' }],
      render: (_node, blockAttributes) => ['ul', blockAttributes, 0],
    }),
  ],
  [
    'code_block',
    definePageBlock({
      code: true,
      content: 'text*',
      group: 'block',
      marks: '',
      parseDOM: [{ preserveWhitespace: 'full', tag: 'pre' }],
      render: (_node, blockAttributes) => ['pre', blockAttributes, ['code', 0]],
    }),
  ],
  [
    'divider',
    definePageBlock({
      atom: true,
      group: 'block',
      parseDOM: [{ tag: 'hr' }],
      render: (_node, blockAttributes) => ['hr', blockAttributes],
    }),
  ],
  [
    'embed',
    definePageBlock({
      attrs: { provider: {}, url: {} },
      atom: true,
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorEmbedAttrs, tag: 'div[data-page-embed]' }],
      render: (node, blockAttributes) => [
        'div',
        { ...blockAttributes, 'data-page-embed': node.attrs.provider, 'data-url': node.attrs.url },
      ],
    }),
  ],
  [
    'file',
    definePageBlock({
      attrs: { alt: { default: null }, assetId: {}, caption: { default: null } },
      atom: true,
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorAssetAttrs, tag: 'div[data-page-file]' }],
      render: (node, blockAttributes) => [
        'div',
        {
          ...blockAttributes,
          'data-page-file': true,
          'data-asset-id': node.attrs.assetId,
          'data-caption': node.attrs.caption ?? '',
        },
      ],
    }),
  ],
  [
    'heading',
    definePageBlock({
      attrs: { collapsed: { default: false }, level: { default: 1 } },
      content: 'inline*',
      defining: true,
      group: 'block',
      parseDOM: [
        { getAttrs: readPageEditorHeadingAttrs(1), tag: 'h1' },
        { getAttrs: readPageEditorHeadingAttrs(2), tag: 'h2' },
        { getAttrs: readPageEditorHeadingAttrs(3), tag: 'h3' },
      ],
      render: (node, blockAttributes) => [
        `h${node.attrs.level}`,
        node.attrs.collapsed === true ? { ...blockAttributes, 'data-collapsed': 'true' } : blockAttributes,
        0,
      ],
    }),
  ],
  [
    'image',
    definePageBlock({
      attrs: { alt: { default: null }, assetId: {}, caption: { default: null } },
      atom: true,
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorAssetAttrs, tag: 'img[data-page-image]' }],
      render: (node, blockAttributes) => [
        'img',
        {
          ...blockAttributes,
          'data-asset-id': node.attrs.assetId,
          'data-page-image': true,
          alt: node.attrs.alt ?? '',
        },
      ],
    }),
  ],
  [
    'list_item',
    definePageBlock({
      content: 'paragraph block*',
      defining: true,
      parseDOM: [{ tag: 'li' }],
      render: (_node, blockAttributes) => ['li', blockAttributes, 0],
    }),
  ],
  [
    'task_list',
    definePageBlock({
      content: 'task_item+',
      group: 'block',
      parseDOM: [{ tag: 'ul[data-task-list]' }],
      render: (_node, blockAttributes) => [
        'ul',
        { ...blockAttributes, 'data-task-list': 'true', class: PAGE_EDITOR_TASK_LIST_CLASS },
        0,
      ],
    }),
  ],
  [
    'task_item',
    definePageBlock({
      attrs: { checked: { default: false } },
      content: 'paragraph block*',
      defining: true,
      parseDOM: [{ getAttrs: getPageEditorTaskAttrs, tag: 'li[data-task-item]' }],
      render: (node, blockAttributes) => [
        'li',
        {
          ...blockAttributes,
          'data-task-item': 'true',
          class: PAGE_EDITOR_TASK_ITEM_STYLE_CLASS,
          ...(node.attrs.checked === true ? { 'data-checked': 'true' } : {}),
        },
        0,
      ],
    }),
  ],
  [
    'callout',
    definePageBlock({
      attrs: { icon: { default: null } },
      content: 'block+',
      defining: true,
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorCalloutAttrs, tag: 'aside[data-callout]' }],
      render: (node, blockAttributes) => [
        'aside',
        {
          ...blockAttributes,
          'data-callout': 'true',
          class: PAGE_EDITOR_CALLOUT_CLASS,
          ...(typeof node.attrs.icon === 'string' ? { 'data-icon': node.attrs.icon } : {}),
        },
        0,
      ],
    }),
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
    definePageBlock({
      attrs: { order: { default: 1 } },
      content: 'list_item+',
      group: 'block',
      parseDOM: [
        { getAttrs: (element: Element) => ({ order: Number(element.getAttribute('start')) || 1 }), tag: 'ol' },
      ],
      render: (node, blockAttributes) => [
        'ol',
        node.attrs.order === 1 ? blockAttributes : { ...blockAttributes, start: node.attrs.order },
        0,
      ],
    }),
  ],
  [
    'table',
    definePageBlock({
      content: 'table_row+',
      group: 'block',
      parseDOM: [{ tag: 'table' }],
      render: (_node, blockAttributes) => ['table', blockAttributes, ['tbody', 0]],
    }),
  ],
  [
    'table_cell',
    definePageBlock({
      content: 'block+',
      parseDOM: [{ tag: 'td' }],
      render: (_node, blockAttributes) => ['td', blockAttributes, 0],
    }),
  ],
  [
    'table_row',
    definePageBlock({
      content: 'table_cell+',
      parseDOM: [{ tag: 'tr' }],
      render: (_node, blockAttributes) => ['tr', blockAttributes, 0],
    }),
  ],
  [
    'toggle',
    definePageBlock({
      attrs: { open: { default: false }, summary: {} },
      content: 'block+',
      defining: true,
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorToggleAttrs, tag: 'details[data-page-toggle]' }],
      render: (node, blockAttributes): DOMOutputSpec => [
        'details',
        {
          ...blockAttributes,
          'data-page-toggle': true,
          ...(node.attrs.open === true ? { open: 'true' } : {}),
        },
        ['summary', node.attrs.summary],
        ['div', 0],
      ],
    }),
  ],
  [
    'column_list',
    definePageBlock({
      content: 'column+',
      group: 'block',
      parseDOM: [{ tag: 'div[data-column-list]' }],
      render: (_node, blockAttributes) => [
        'div',
        { ...blockAttributes, 'data-column-list': 'true', class: PAGE_EDITOR_COLUMN_LIST_CLASS },
        0,
      ],
    }),
  ],
  [
    'column',
    definePageBlock({
      attrs: { width: { default: null } },
      content: 'block+',
      parseDOM: [{ getAttrs: getPageEditorColumnAttrs, tag: 'div[data-column]' }],
      render: (node, blockAttributes) => [
        'div',
        {
          ...blockAttributes,
          'data-column': 'true',
          class: PAGE_EDITOR_COLUMN_CLASS,
          ...(typeof node.attrs.width === 'number' ? { style: `flex-grow:${String(node.attrs.width)}` } : {}),
        },
        0,
      ],
    }),
  ],
  [
    'block_children',
    definePageBlock({
      content: 'block+',
      parseDOM: [{ tag: 'div[data-block-children]' }],
      render: (_node, blockAttributes) => [
        'div',
        { ...blockAttributes, 'data-block-children': 'true', class: PAGE_EDITOR_BLOCK_CHILDREN_CLASS },
        0,
      ],
    }),
  ],
  [
    /**
     * A block written by a version that knows more than this one. It stands in
     * the page as a placeholder that says which type it is, and carries the
     * original word for word so that saving the page gives it back untouched.
     */
    PAGE_EDITOR_UNSUPPORTED_TYPE,
    definePageBlock({
      attrs: { name: {}, source: {} },
      atom: true,
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorUnsupportedAttrs, tag: `div[${PAGE_EDITOR_UNSUPPORTED_ATTRIBUTE}]` }],
      render: (node, blockAttributes) => [
        'div',
        {
          ...blockAttributes,
          [PAGE_EDITOR_UNSUPPORTED_ATTRIBUTE]: node.attrs.name,
          class: PAGE_EDITOR_UNSUPPORTED_STYLE_CLASS,
        },
      ],
    }),
  ],
  [
    'nested_block',
    definePageBlock({
      content: 'block block_children',
      group: 'block',
      parseDOM: [{ tag: 'div[data-nested-block]' }],
      render: (_node, blockAttributes) => ['div', { ...blockAttributes, 'data-nested-block': 'true' }, 0],
    }),
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

const getPageEditorCommentAttrs = (element: Element): { readonly id: string } | false => {
  const id = element.getAttribute(PAGE_EDITOR_COMMENT_ID_ATTRIBUTE);
  return id === null || id.length === 0 ? false : { id };
};

export const pageEditorSchema = new Schema({
  marks: {
    code: { toDOM: (): DOMOutputSpec => ['code', 0] },
    /**
     * A remark left on a fragment of the text. It says only which remark it is:
     * what was said is kept by the block, as it is for a whole block.
     */
    comment: {
      attrs: { id: {} },
      inclusive: false,
      parseDOM: [{ getAttrs: getPageEditorCommentAttrs, tag: `span[${PAGE_EDITOR_COMMENT_ID_ATTRIBUTE}]` }],
      toDOM: (mark): DOMOutputSpec => [
        'span',
        { [PAGE_EDITOR_COMMENT_ID_ATTRIBUTE]: mark.attrs.id, class: PAGE_EDITOR_COMMENTED_TEXT_STYLE_CLASS },
        0,
      ],
    },
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
