import {
  isAllowedPageEmbedUrl,
  PAGE_BLOCK_ALIGNMENTS,
  PAGE_CALLOUT_ICONS,
  PAGE_CODE_LANGUAGES,
  PAGE_DIAGRAM_VIEWS,
  PAGE_EMBED_PROVIDERS,
  PAGE_FILE_DISPLAYS,
} from '@company-brain/shared';
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
  PAGE_EDITOR_TABLE_CELL_ATTRS,
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

/** What a page says about the file it holds: what kind it is, how heavy, and how it is shown. */
const getPageEditorFileAttrs = (element: HTMLElement): Record<string, string | number | null> | false => {
  const asset = getPageEditorMediaAttrs(element);
  if (asset === false) return false;
  const size = Number.parseInt(element.dataset.size ?? '', 10);
  const display = element.dataset.display;
  return {
    ...asset,
    display: PAGE_FILE_DISPLAYS.find((known) => known === display) ?? null,
    mimeType: element.dataset.mimeType ?? null,
    size: Number.isFinite(size) && size >= 0 ? size : null,
  };
};

/** How a player was left standing on the page: where in the column, and how wide. */
const getPageEditorMediaAttrs = (element: HTMLElement): Record<string, string | number | null> | false => {
  const asset = getPageEditorAssetAttrs(element);
  if (asset === false) return false;
  const align = element.dataset.align;
  const width = Number.parseFloat(element.dataset.width ?? '');
  return {
    ...asset,
    align: PAGE_BLOCK_ALIGNMENTS.find((known) => known === align) ?? null,
    width: Number.isFinite(width) && width > 0 && width <= 1 ? width : null,
  };
};

/** How an image was left standing on the page: where in the column, and how much of it. */
const getPageEditorImageAttrs = (element: HTMLElement): Record<string, string | number | null> | false => {
  const asset = getPageEditorAssetAttrs(element);
  if (asset === false) return false;
  const align = element.dataset.align;
  const width = Number.parseFloat(element.dataset.width ?? '');
  return {
    ...asset,
    align: PAGE_BLOCK_ALIGNMENTS.find((known) => known === align) ?? null,
    width: Number.isFinite(width) && width > 0 && width <= 1 ? width : null,
  };
};

/** What a page kept about a link it holds as a card. */
const getPageEditorBookmarkAttrs = (element: HTMLElement): Record<string, string | null> | false => {
  const url = element.getAttribute('href') ?? element.dataset.url;
  if (url === undefined || url === null || url.length === 0) return false;
  return {
    description: element.dataset.description ?? null,
    icon: element.dataset.icon ?? null,
    title: element.dataset.title ?? null,
    url,
  };
};

const getPageEditorEmbedAttrs = (element: HTMLElement): Record<string, string | number | null> | false => {
  const { pageEmbed, url } = element.dataset;
  const knownProvider = PAGE_EMBED_PROVIDERS.find((entry) => entry === pageEmbed);
  if (knownProvider === undefined || url === undefined || !isAllowedPageEmbedUrl(knownProvider, url)) return false;
  const align = element.dataset.align;
  const width = Number.parseFloat(element.dataset.width ?? '');
  return {
    align: PAGE_BLOCK_ALIGNMENTS.find((known) => known === align) ?? null,
    provider: knownProvider,
    url,
    width: Number.isFinite(width) && width > 0 && width <= 1 ? width : null,
  };
};

const getPageEditorToggleAttrs = (element: Element): { readonly open: boolean; readonly summary: string } | false => {
  const summary = element.querySelector('summary')?.textContent;
  if (summary === null || summary === undefined) return false;
  return { open: element.hasAttribute('open'), summary };
};

const getPageEditorCodeAttrs = (element: Element): Record<string, string | boolean | null> => {
  const language = element.getAttribute('data-language');
  const shown = element.getAttribute('data-shown');
  return {
    language: language !== null && PAGE_CODE_LANGUAGES.some((known) => known === language) ? language : null,
    shown: PAGE_DIAGRAM_VIEWS.find((known) => known === shown) ?? null,
    wrapped: element.getAttribute('data-wrapped') === 'true',
  };
};

/**
 * How far a cell reaches and how wide its column was left.
 *
 * A table records the widths on the cells of a row rather than on the table, so
 * stretching a column is a change to that row and travels with it.
 */
const getPageEditorTableCellAttrs = (
  element: HTMLElement,
): { readonly colspan: number; readonly colwidth: readonly number[] | null; readonly rowspan: number } => {
  const widths = element.dataset.colwidth?.split(',').map(Number).filter(Number.isFinite) ?? [];
  return {
    colspan: Number(element.getAttribute('colspan')) || 1,
    colwidth: widths.length === 0 ? null : widths,
    rowspan: Number(element.getAttribute('rowspan')) || 1,
  };
};

const readTableCellDomAttrs = (node: EditorNode): Record<string, string> => ({
  ...(node.attrs.colspan === 1 ? {} : { colspan: String(node.attrs.colspan) }),
  ...(node.attrs.rowspan === 1 ? {} : { rowspan: String(node.attrs.rowspan) }),
  ...(Array.isArray(node.attrs.colwidth) ? { 'data-colwidth': node.attrs.colwidth.join(',') } : {}),
});

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
      attrs: { language: { default: null }, shown: { default: null }, wrapped: { default: false } },
      code: true,
      content: 'text*',
      group: 'block',
      marks: '',
      parseDOM: [{ getAttrs: getPageEditorCodeAttrs, preserveWhitespace: 'full', tag: 'pre' }],
      render: (node, blockAttributes) => [
        'pre',
        {
          ...blockAttributes,
          ...(typeof node.attrs.language === 'string' ? { 'data-language': node.attrs.language } : {}),
          ...(typeof node.attrs.shown === 'string' ? { 'data-shown': node.attrs.shown } : {}),
          ...(node.attrs.wrapped === true ? { 'data-wrapped': 'true' } : {}),
        },
        ['code', 0],
      ],
    }),
  ],
  [
    'video',
    definePageBlock({
      attrs: {
        align: { default: null },
        alt: { default: null },
        assetId: {},
        caption: { default: null },
        width: { default: null },
      },
      atom: true,
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorMediaAttrs, tag: 'video[data-page-video]' }],
      render: (node, blockAttributes) => [
        'video',
        {
          ...blockAttributes,
          'data-asset-id': node.attrs.assetId,
          'data-caption': node.attrs.caption ?? '',
          'data-page-video': true,
          ...(typeof node.attrs.align === 'string' ? { 'data-align': node.attrs.align } : {}),
          ...(typeof node.attrs.width === 'number' ? { 'data-width': String(node.attrs.width) } : {}),
        },
      ],
    }),
  ],
  [
    'audio',
    definePageBlock({
      attrs: {
        align: { default: null },
        alt: { default: null },
        assetId: {},
        caption: { default: null },
        width: { default: null },
      },
      atom: true,
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorMediaAttrs, tag: 'audio[data-page-audio]' }],
      render: (node, blockAttributes) => [
        'audio',
        {
          ...blockAttributes,
          'data-asset-id': node.attrs.assetId,
          'data-caption': node.attrs.caption ?? '',
          'data-page-audio': true,
          ...(typeof node.attrs.align === 'string' ? { 'data-align': node.attrs.align } : {}),
          ...(typeof node.attrs.width === 'number' ? { 'data-width': String(node.attrs.width) } : {}),
        },
      ],
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
  /** What is in the page, listed by the page itself: it holds nothing of its own. */
  [
    'table_of_contents',
    definePageBlock({
      atom: true,
      group: 'block',
      parseDOM: [{ tag: 'nav[data-page-contents]' }],
      render: (_node, blockAttributes) => ['nav', { ...blockAttributes, 'data-page-contents': 'true' }],
    }),
  ],
  [
    'bookmark',
    definePageBlock({
      attrs: { description: { default: null }, icon: { default: null }, title: { default: null }, url: {} },
      atom: true,
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorBookmarkAttrs, tag: 'a[data-page-bookmark]' }],
      render: (node, blockAttributes) => [
        'a',
        {
          ...blockAttributes,
          'data-page-bookmark': 'true',
          href: node.attrs.url,
          rel: 'noopener noreferrer',
          ...(typeof node.attrs.title === 'string' ? { 'data-title': node.attrs.title } : {}),
          ...(typeof node.attrs.description === 'string' ? { 'data-description': node.attrs.description } : {}),
          ...(typeof node.attrs.icon === 'string' ? { 'data-icon': node.attrs.icon } : {}),
        },
      ],
    }),
  ],
  [
    'embed',
    definePageBlock({
      attrs: { align: { default: null }, provider: {}, url: {}, width: { default: null } },
      atom: true,
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorEmbedAttrs, tag: 'div[data-page-embed]' }],
      render: (node, blockAttributes) => [
        'div',
        {
          ...blockAttributes,
          'data-page-embed': node.attrs.provider,
          'data-url': node.attrs.url,
          ...(typeof node.attrs.align === 'string' ? { 'data-align': node.attrs.align } : {}),
          ...(typeof node.attrs.width === 'number' ? { 'data-width': String(node.attrs.width) } : {}),
        },
      ],
    }),
  ],
  [
    'file',
    definePageBlock({
      attrs: {
        align: { default: null },
        alt: { default: null },
        assetId: {},
        caption: { default: null },
        display: { default: null },
        mimeType: { default: null },
        size: { default: null },
        width: { default: null },
      },
      atom: true,
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorFileAttrs, tag: 'div[data-page-file]' }],
      render: (node, blockAttributes) => [
        'div',
        {
          ...blockAttributes,
          'data-page-file': true,
          'data-asset-id': node.attrs.assetId,
          'data-caption': node.attrs.caption ?? '',
          ...(typeof node.attrs.align === 'string' ? { 'data-align': node.attrs.align } : {}),
          ...(typeof node.attrs.display === 'string' ? { 'data-display': node.attrs.display } : {}),
          ...(typeof node.attrs.mimeType === 'string' ? { 'data-mime-type': node.attrs.mimeType } : {}),
          ...(typeof node.attrs.size === 'number' ? { 'data-size': String(node.attrs.size) } : {}),
          ...(typeof node.attrs.width === 'number' ? { 'data-width': String(node.attrs.width) } : {}),
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
      attrs: {
        align: { default: null },
        alt: { default: null },
        assetId: {},
        caption: { default: null },
        width: { default: null },
      },
      atom: true,
      group: 'block',
      parseDOM: [{ getAttrs: getPageEditorImageAttrs, tag: 'img[data-page-image]' }],
      render: (node, blockAttributes) => [
        'img',
        {
          ...blockAttributes,
          'data-asset-id': node.attrs.assetId,
          'data-page-image': true,
          alt: node.attrs.alt ?? '',
          ...(typeof node.attrs.align === 'string' ? { 'data-align': node.attrs.align } : {}),
          ...(typeof node.attrs.width === 'number' ? { 'data-width': String(node.attrs.width) } : {}),
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
      isolating: true,
      parseDOM: [{ tag: 'table' }],
      render: (_node, blockAttributes) => ['table', blockAttributes, ['tbody', 0]],
      tableRole: 'table',
    }),
  ],
  [
    'table_cell',
    definePageBlock({
      attrs: PAGE_EDITOR_TABLE_CELL_ATTRS,
      content: 'block+',
      isolating: true,
      parseDOM: [{ getAttrs: getPageEditorTableCellAttrs, tag: 'td' }],
      render: (node, blockAttributes) => ['td', { ...blockAttributes, ...readTableCellDomAttrs(node) }, 0],
      tableRole: 'cell',
    }),
  ],
  [
    'table_header',
    definePageBlock({
      attrs: PAGE_EDITOR_TABLE_CELL_ATTRS,
      content: 'block+',
      isolating: true,
      parseDOM: [{ getAttrs: getPageEditorTableCellAttrs, tag: 'th' }],
      render: (node, blockAttributes) => ['th', { ...blockAttributes, ...readTableCellDomAttrs(node) }, 0],
      tableRole: 'header_cell',
    }),
  ],
  [
    'table_row',
    definePageBlock({
      content: '(table_cell | table_header)+',
      parseDOM: [{ tag: 'tr' }],
      render: (_node, blockAttributes) => ['tr', blockAttributes, 0],
      tableRole: 'row',
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
