import {
  isAllowedPageEmbedUrl,
  isPageCalendarDay,
  PAGE_BLOCK_ALIGNMENTS,
  PAGE_BLOCK_COLORS,
  PAGE_BUTTON_DEEDS,
  PAGE_BUTTON_PLACES,
  PAGE_CALLOUT_ICONS,
  PAGE_CODE_LANGUAGES,
  PAGE_DIAGRAM_FRAME_HEIGHT_LEAST,
  PAGE_DIAGRAM_FRAME_HEIGHT_MOST,
  PAGE_DIAGRAM_VIEWS,
  PAGE_DOCUMENT_MARKS,
  PAGE_DOCUMENT_NODES,
  PAGE_EMBED_PROVIDERS,
  PAGE_FILE_DISPLAYS,
} from '@company-brain/shared';
import type { DOMOutputSpec, Node as EditorNode, NodeSpec } from 'prosemirror-model';
import { Schema } from 'prosemirror-model';
import {
  PAGE_EDITOR_BACKGROUND_COLOR_ATTRIBUTE,
  PAGE_EDITOR_BACKGROUND_COLOR_MARK,
  PAGE_EDITOR_BLOCK_CHILDREN_CLASS,
  PAGE_EDITOR_BLOCK_ID_ATTRIBUTE,
  PAGE_EDITOR_CALLOUT_CLASS,
  PAGE_EDITOR_COLUMN_CLASS,
  PAGE_EDITOR_COLUMN_LIST_CLASS,
  PAGE_EDITOR_COMMENT_ID_ATTRIBUTE,
  PAGE_EDITOR_COMMENTED_TEXT_STYLE_CLASS,
  PAGE_EDITOR_TASK_ITEM_STYLE_CLASS,
  PAGE_EDITOR_TASK_LIST_CLASS,
  PAGE_EDITOR_TEXT_COLOR_ATTRIBUTE,
  PAGE_EDITOR_TEXT_COLOR_MARK,
  PAGE_EDITOR_UNDERLINE_STYLE_CLASS,
  PAGE_EDITOR_UNSUPPORTED_ATTRIBUTE,
  PAGE_EDITOR_UNSUPPORTED_STYLE_CLASS,
  PAGE_EDITOR_UNSUPPORTED_TYPE,
} from '../blocks/constants/pages.editor.blocks.constants';
import { definePageBlock } from '../blocks/lib/pages.editor.block-spec.lib';
import { PAGE_EDITOR_LINK_PROTOCOLS } from '../text/constants/pages.editor.link.constants';

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
  const asset = getPageEditorFramedAssetAttrs(element);
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

/** How something that hangs on the page was left standing: where in the column, and how wide. */
const getPageEditorFramedAssetAttrs = (element: HTMLElement): Record<string, string | number | null> | false => {
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

/** A frame height read from the page, kept only when it is one a drawing's frame may have. */
const readPageEditorFrameHeight = (said: string | undefined): number | null => {
  const height = Number(said);
  const isAllowed =
    Number.isInteger(height) && height >= PAGE_DIAGRAM_FRAME_HEIGHT_LEAST && height <= PAGE_DIAGRAM_FRAME_HEIGHT_MOST;
  return isAllowed ? height : null;
};

const getPageEditorCodeAttrs = (element: HTMLElement): Record<string, string | number | boolean | null> => {
  const { frameHeight, language, shown, wrapped } = element.dataset;
  return {
    frameHeight: readPageEditorFrameHeight(frameHeight),
    language: language !== undefined && PAGE_CODE_LANGUAGES.some((known) => known === language) ? language : null,
    shown: PAGE_DIAGRAM_VIEWS.find((known) => known === shown) ?? null,
    wrapped: wrapped === 'true',
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

const getPageEditorCalloutAttrs = (element: HTMLElement): { readonly icon: string | null } => {
  const icon = element.dataset.icon;
  return { icon: icon !== undefined && isPageCalloutIcon(icon) ? icon : null };
};

const getPageEditorMentionAttrs = (
  element: HTMLElement,
): { readonly label: string; readonly pageId: string; readonly spaceId: string } | false => {
  const { label, pageMention: pageId, spaceId } = element.dataset;
  if (pageId === undefined || label === undefined || label.length === 0 || spaceId === undefined) return false;
  return { label, pageId, spaceId };
};

const getPageEditorPersonAttrs = (
  element: HTMLElement,
): { readonly label: string; readonly userId: string } | false => {
  const { label, pagePerson: userId } = element.dataset;
  if (userId === undefined || label === undefined || label.length === 0) return false;
  return { label, userId };
};

const getPageEditorDateAttrs = (element: HTMLElement): { readonly at: string } | false => {
  const at = element.dataset.pageDate;
  return at === undefined || !isPageCalendarDay(at) ? false : { at };
};

const getPageEditorFormulaAttrs = (element: HTMLElement): { readonly latex: string } | false => {
  const { pageFormula: latex } = element.dataset;
  return latex === undefined ? false : { latex };
};

const getPageEditorCollectionAttrs = (
  element: HTMLElement,
): { readonly pageId: string; readonly spaceId: string; readonly viewName: string | null } | false => {
  const { pageCollection: pageId, spaceId, viewName } = element.dataset;
  if (pageId === undefined || pageId.length === 0 || spaceId === undefined || spaceId.length === 0) return false;
  return { pageId, spaceId, viewName: viewName === undefined || viewName.length === 0 ? null : viewName };
};

const getPageEditorSubpageAttrs = (
  element: HTMLElement,
): { readonly label: string; readonly pageId: string; readonly spaceId: string } | false => {
  const { pageSubpage: pageId, spaceId, label } = element.dataset;
  if (pageId === undefined || pageId.length === 0 || spaceId === undefined || spaceId.length === 0) return false;
  return { label: label === undefined || label.length === 0 ? pageId : label, pageId, spaceId };
};

/** A colour that is not one of the few the page allows is no colour at all. */
const readPageColor = (value: string | null): string | null =>
  PAGE_BLOCK_COLORS.find((known) => known === value) ?? null;

const getPageEditorTextColorAttrs = (element: HTMLElement): { readonly color: string } | false => {
  const color = readPageColor(element.getAttribute(PAGE_EDITOR_TEXT_COLOR_ATTRIBUTE));
  return color === null ? false : { color };
};

const getPageEditorBackgroundColorAttrs = (element: HTMLElement): { readonly color: string } | false => {
  const color = readPageColor(element.getAttribute(PAGE_EDITOR_BACKGROUND_COLOR_ATTRIBUTE));
  return color === null ? false : { color };
};

const getPageEditorButtonAttrs = (element: HTMLElement): Record<string, string | null> | false => {
  const { collection, deed, label, place, spaceId } = element.dataset;
  if (label === undefined || label.length === 0) return false;
  return {
    deed: PAGE_BUTTON_DEEDS.find((known) => known === deed) ?? null,
    label,
    pageId: collection ?? null,
    place: PAGE_BUTTON_PLACES.find((known) => known === place) ?? null,
    spaceId: spaceId ?? null,
  };
};

const getPageEditorSyncedAttrs = (
  element: HTMLElement,
): { readonly blockId: string; readonly pageId: string; readonly spaceId: string } | false => {
  const { pageSynced: pageId, spaceId, syncedBlock: blockId } = element.dataset;
  if (pageId === undefined || pageId.length === 0 || spaceId === undefined || spaceId.length === 0) return false;
  return blockId === undefined || blockId.length === 0 ? false : { blockId, pageId, spaceId };
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
  ['doc', PAGE_DOCUMENT_NODES.doc],
  [
    'paragraph',
    definePageBlock({
      ...PAGE_DOCUMENT_NODES.paragraph,
      parseDOM: [{ tag: 'p' }],
      render: (_node, blockAttributes) => ['p', blockAttributes, 0],
    }),
  ],
  ['text', PAGE_DOCUMENT_NODES.text],
  [
    'hard_break',
    {
      ...PAGE_DOCUMENT_NODES.hard_break,
      parseDOM: [{ tag: 'br' }],
      selectable: false,
      toDOM: () => ['br'],
    },
  ],
  [
    'collection',
    definePageBlock({
      ...PAGE_DOCUMENT_NODES.collection,
      atom: true,
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
      ...PAGE_DOCUMENT_NODES.blockquote,
      parseDOM: [{ tag: 'blockquote' }],
      render: (_node, blockAttributes) => ['blockquote', blockAttributes, 0],
    }),
  ],
  [
    'bullet_list',
    definePageBlock({
      ...PAGE_DOCUMENT_NODES.bullet_list,
      parseDOM: [{ tag: 'ul' }],
      render: (_node, blockAttributes) => ['ul', blockAttributes, 0],
    }),
  ],
  [
    'code_block',
    definePageBlock({
      ...PAGE_DOCUMENT_NODES.code_block,
      code: true,
      parseDOM: [{ getAttrs: getPageEditorCodeAttrs, preserveWhitespace: 'full', tag: 'pre' }],
      render: (node, blockAttributes) => [
        'pre',
        {
          ...blockAttributes,
          ...(typeof node.attrs.language === 'string' ? { 'data-language': node.attrs.language } : {}),
          ...(typeof node.attrs.shown === 'string' ? { 'data-shown': node.attrs.shown } : {}),
          ...(node.attrs.wrapped === true ? { 'data-wrapped': 'true' } : {}),
          ...(typeof node.attrs.frameHeight === 'number'
            ? { 'data-frame-height': String(node.attrs.frameHeight) }
            : {}),
        },
        ['code', 0],
      ],
    }),
  ],
  [
    'video',
    definePageBlock({
      ...PAGE_DOCUMENT_NODES.video,
      atom: true,
      parseDOM: [{ getAttrs: getPageEditorFramedAssetAttrs, tag: 'video[data-page-video]' }],
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
      ...PAGE_DOCUMENT_NODES.audio,
      atom: true,
      parseDOM: [{ getAttrs: getPageEditorFramedAssetAttrs, tag: 'audio[data-page-audio]' }],
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
      ...PAGE_DOCUMENT_NODES.divider,
      atom: true,
      parseDOM: [{ tag: 'hr' }],
      render: (_node, blockAttributes) => ['hr', blockAttributes],
    }),
  ],
  /** What is in the page, listed by the page itself: it holds nothing of its own. */
  [
    'table_of_contents',
    definePageBlock({
      ...PAGE_DOCUMENT_NODES.table_of_contents,
      atom: true,
      parseDOM: [{ tag: 'nav[data-page-contents]' }],
      render: (_node, blockAttributes) => ['nav', { ...blockAttributes, 'data-page-contents': 'true' }],
    }),
  ],
  /**
   * A button, and what it writes when pressed: what it writes is what it holds,
   * so setting it up is writing in it like anywhere else on the page.
   */
  [
    'button',
    definePageBlock({
      ...PAGE_DOCUMENT_NODES.button,
      defining: true,
      parseDOM: [{ getAttrs: getPageEditorButtonAttrs, tag: 'div[data-page-button]' }],
      render: (node, blockAttributes): DOMOutputSpec => [
        'div',
        {
          ...blockAttributes,
          'data-label': node.attrs.label,
          'data-page-button': 'true',
          ...(typeof node.attrs.deed === 'string' ? { 'data-deed': node.attrs.deed } : {}),
          ...(typeof node.attrs.place === 'string' ? { 'data-place': node.attrs.place } : {}),
          ...(typeof node.attrs.pageId === 'string' ? { 'data-collection': node.attrs.pageId } : {}),
          ...(typeof node.attrs.spaceId === 'string' ? { 'data-space-id': node.attrs.spaceId } : {}),
        },
        ['div', 0],
      ],
    }),
  ],
  /** A block that lives in another page and is only shown here, as it stands there now. */
  [
    'synced',
    definePageBlock({
      ...PAGE_DOCUMENT_NODES.synced,
      atom: true,
      parseDOM: [{ getAttrs: getPageEditorSyncedAttrs, tag: 'div[data-page-synced]' }],
      render: (node, blockAttributes) => [
        'div',
        {
          ...blockAttributes,
          'data-page-synced': node.attrs.pageId,
          'data-space-id': node.attrs.spaceId,
          'data-synced-block': node.attrs.blockId,
        },
      ],
    }),
  ],
  /** A page that hangs from this one, standing in the writing as the line that leads to it. */
  [
    'subpage',
    definePageBlock({
      ...PAGE_DOCUMENT_NODES.subpage,
      atom: true,
      parseDOM: [{ getAttrs: getPageEditorSubpageAttrs, tag: 'a[data-page-subpage]' }],
      render: (node, blockAttributes) => [
        'a',
        {
          ...blockAttributes,
          'data-label': node.attrs.label,
          'data-page-subpage': node.attrs.pageId,
          'data-space-id': node.attrs.spaceId,
        },
      ],
    }),
  ],
  [
    'bookmark',
    definePageBlock({
      ...PAGE_DOCUMENT_NODES.bookmark,
      atom: true,
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
      ...PAGE_DOCUMENT_NODES.embed,
      atom: true,
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
      ...PAGE_DOCUMENT_NODES.file,
      atom: true,
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
      ...PAGE_DOCUMENT_NODES.heading,
      defining: true,
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
      ...PAGE_DOCUMENT_NODES.image,
      atom: true,
      parseDOM: [{ getAttrs: getPageEditorFramedAssetAttrs, tag: 'img[data-page-image]' }],
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
      ...PAGE_DOCUMENT_NODES.list_item,
      defining: true,
      parseDOM: [{ tag: 'li' }],
      render: (_node, blockAttributes) => ['li', blockAttributes, 0],
    }),
  ],
  [
    'task_list',
    definePageBlock({
      ...PAGE_DOCUMENT_NODES.task_list,
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
      ...PAGE_DOCUMENT_NODES.task_item,
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
      ...PAGE_DOCUMENT_NODES.callout,
      defining: true,
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
      ...PAGE_DOCUMENT_NODES.mention,
      atom: true,
      parseDOM: [{ getAttrs: getPageEditorMentionAttrs, tag: 'span[data-page-mention]' }],
      toDOM: (node: EditorNode): DOMOutputSpec => [
        'span',
        { 'data-label': node.attrs.label, 'data-page-mention': node.attrs.pageId, 'data-space-id': node.attrs.spaceId },
        `@${node.attrs.label}`,
      ],
    },
  ],
  /** A person named in the writing: who, and what they were called at the time. */
  [
    'person',
    {
      ...PAGE_DOCUMENT_NODES.person,
      atom: true,
      parseDOM: [{ getAttrs: getPageEditorPersonAttrs, tag: 'span[data-page-person]' }],
      selectable: true,
      toDOM: (node: EditorNode): DOMOutputSpec => [
        'span',
        { 'data-label': node.attrs.label, 'data-page-person': node.attrs.userId },
        node.attrs.label,
      ],
    },
  ],
  /** A date named in the writing, kept as the calendar day it points at. */
  [
    'date',
    {
      ...PAGE_DOCUMENT_NODES.date,
      atom: true,
      parseDOM: [{ getAttrs: getPageEditorDateAttrs, tag: 'span[data-page-date]' }],
      selectable: true,
      toDOM: (node: EditorNode): DOMOutputSpec => ['span', { 'data-page-date': node.attrs.at }, node.attrs.at],
    },
  ],
  /** A formula inside the line. Empty means one not written yet. */
  [
    'formula',
    {
      ...PAGE_DOCUMENT_NODES.formula,
      atom: true,
      parseDOM: [{ getAttrs: getPageEditorFormulaAttrs, tag: 'span[data-page-formula]' }],
      selectable: true,
      toDOM: (node: EditorNode): DOMOutputSpec => ['span', { 'data-page-formula': node.attrs.latex }, node.attrs.latex],
    },
  ],
  [
    'ordered_list',
    definePageBlock({
      ...PAGE_DOCUMENT_NODES.ordered_list,
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
      ...PAGE_DOCUMENT_NODES.table,
      isolating: true,
      parseDOM: [{ tag: 'table' }],
      render: (_node, blockAttributes) => ['table', blockAttributes, ['tbody', 0]],
      tableRole: 'table',
    }),
  ],
  [
    'table_cell',
    definePageBlock({
      ...PAGE_DOCUMENT_NODES.table_cell,
      isolating: true,
      parseDOM: [{ getAttrs: getPageEditorTableCellAttrs, tag: 'td' }],
      render: (node, blockAttributes) => ['td', { ...blockAttributes, ...readTableCellDomAttrs(node) }, 0],
      tableRole: 'cell',
    }),
  ],
  [
    'table_header',
    definePageBlock({
      ...PAGE_DOCUMENT_NODES.table_header,
      isolating: true,
      parseDOM: [{ getAttrs: getPageEditorTableCellAttrs, tag: 'th' }],
      render: (node, blockAttributes) => ['th', { ...blockAttributes, ...readTableCellDomAttrs(node) }, 0],
      tableRole: 'header_cell',
    }),
  ],
  [
    'table_row',
    definePageBlock({
      ...PAGE_DOCUMENT_NODES.table_row,
      parseDOM: [{ tag: 'tr' }],
      render: (_node, blockAttributes) => ['tr', blockAttributes, 0],
      tableRole: 'row',
    }),
  ],
  [
    'toggle',
    definePageBlock({
      ...PAGE_DOCUMENT_NODES.toggle,
      defining: true,
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
      ...PAGE_DOCUMENT_NODES.column_list,
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
      ...PAGE_DOCUMENT_NODES.column,
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
      ...PAGE_DOCUMENT_NODES.block_children,
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
      ...PAGE_DOCUMENT_NODES.unsupported,
      atom: true,
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
      ...PAGE_DOCUMENT_NODES.nested_block,
      parseDOM: [{ tag: 'div[data-nested-block]' }],
      render: (_node, blockAttributes) => ['div', { ...blockAttributes, 'data-nested-block': 'true' }, 0],
    }),
  ],
];

const pageEditorNodes: Readonly<Record<string, NodeSpec>> = Object.fromEntries(pageEditorNodeEntries);

/**
 * Whether a destination is one a link may point at.
 *
 * A page is written by several people at once and travels between them without
 * passing through the stored schema on the way, so the answer has to be given
 * again wherever a destination is written and wherever one is drawn.
 */
export const isPageEditorLinkTarget = (href: string): boolean => {
  const trimmed = href.trim();
  if (trimmed.startsWith('/')) return true;
  if (!URL.canParse(trimmed)) return false;
  return PAGE_EDITOR_LINK_PROTOCOLS.has(new URL(trimmed).protocol);
};

const getPageEditorLinkAttrs = (element: Element): { readonly href: string } | false => {
  const href = element.getAttribute('href');
  return href === null || !isPageEditorLinkTarget(href) ? false : { href };
};

/** A destination nobody may follow is drawn as text, so the writing survives and the link does not. */
const drawPageEditorLink = (href: unknown): DOMOutputSpec =>
  typeof href === 'string' && isPageEditorLinkTarget(href) ? ['a', { href }, 0] : ['span', 0];

const getPageEditorCommentAttrs = (element: Element): { readonly id: string } | false => {
  const id = element.getAttribute(PAGE_EDITOR_COMMENT_ID_ATTRIBUTE);
  return id === null || id.length === 0 ? false : { id };
};

export const pageEditorSchema = new Schema({
  marks: {
    code: { ...PAGE_DOCUMENT_MARKS.code, toDOM: (): DOMOutputSpec => ['code', 0] },
    /**
     * A remark left on a fragment of the text. It says only which remark it is:
     * what was said is kept by the block, as it is for a whole block.
     */
    comment: {
      ...PAGE_DOCUMENT_MARKS.comment,
      parseDOM: [{ getAttrs: getPageEditorCommentAttrs, tag: `span[${PAGE_EDITOR_COMMENT_ID_ATTRIBUTE}]` }],
      toDOM: (mark): DOMOutputSpec => [
        'span',
        { [PAGE_EDITOR_COMMENT_ID_ATTRIBUTE]: mark.attrs.id, class: PAGE_EDITOR_COMMENTED_TEXT_STYLE_CLASS },
        0,
      ],
    },
    em: { ...PAGE_DOCUMENT_MARKS.em, toDOM: (): DOMOutputSpec => ['em', 0] },
    link: {
      ...PAGE_DOCUMENT_MARKS.link,
      parseDOM: [{ getAttrs: getPageEditorLinkAttrs, tag: 'a[href]' }],
      toDOM: (mark) => drawPageEditorLink(mark.attrs.href),
    },
    /**
     * A stretch of writing painted on its own.
     *
     * It is painted with the same few colours a whole block is painted with,
     * and drawn by the same rule: what is read on screen comes from the
     * attribute, so a colour cannot be invented on the spot.
     */
    [PAGE_EDITOR_BACKGROUND_COLOR_MARK]: {
      ...PAGE_DOCUMENT_MARKS.background_color,
      parseDOM: [
        { getAttrs: getPageEditorBackgroundColorAttrs, tag: `span[${PAGE_EDITOR_BACKGROUND_COLOR_ATTRIBUTE}]` },
      ],
      toDOM: (mark): DOMOutputSpec => ['span', { [PAGE_EDITOR_BACKGROUND_COLOR_ATTRIBUTE]: mark.attrs.color }, 0],
    },
    /** Struck through, and read as struck through by whatever the writing is pasted into. */
    strike: {
      ...PAGE_DOCUMENT_MARKS.strike,
      parseDOM: [{ tag: 's' }, { tag: 'del' }, { tag: 'strike' }],
      toDOM: (): DOMOutputSpec => ['s', 0],
    },
    strong: { ...PAGE_DOCUMENT_MARKS.strong, toDOM: (): DOMOutputSpec => ['strong', 0] },
    [PAGE_EDITOR_TEXT_COLOR_MARK]: {
      ...PAGE_DOCUMENT_MARKS.text_color,
      parseDOM: [{ getAttrs: getPageEditorTextColorAttrs, tag: `span[${PAGE_EDITOR_TEXT_COLOR_ATTRIBUTE}]` }],
      toDOM: (mark): DOMOutputSpec => ['span', { [PAGE_EDITOR_TEXT_COLOR_ATTRIBUTE]: mark.attrs.color }, 0],
    },
    /**
     * Underlined, drawn in the colour of the writing rather than the colour of a
     * link: on a page where every link is underlined too, the only thing left to
     * tell them apart is that one of them is not a link.
     */
    underline: {
      ...PAGE_DOCUMENT_MARKS.underline,
      parseDOM: [{ tag: 'u' }, { style: 'text-decoration=underline' }],
      toDOM: (): DOMOutputSpec => ['u', { class: PAGE_EDITOR_UNDERLINE_STYLE_CLASS }, 0],
    },
  },
  nodes: pageEditorNodes,
});
