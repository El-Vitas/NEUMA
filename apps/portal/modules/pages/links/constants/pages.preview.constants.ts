export const PAGE_PREVIEW_OPEN_DELAY_MS = 500;

/** Must outlast the pointer crossing the text between the link and the card at a reading pace. */
export const PAGE_PREVIEW_CLOSE_DELAY_MS = 400;

export const PAGE_PREVIEW_FRAGMENT_LIMIT = 240;

export const PAGE_PREVIEW_GAP_PX = 40;

export const PAGE_PREVIEW_NEW_PAGE_SEGMENT = 'new';

/** Matches `/spaces/:spaceId/pages/:pageId`. */
export const PAGE_PREVIEW_INTERNAL_HREF = /^\/spaces\/([^/?#]+)\/pages\/([^/?#]+)$/;

export const PAGE_PREVIEW_LEADING_ICON = /^\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/u;

export const PAGE_PREVIEW_WHITESPACE = /\s+/g;

/** Marks the card so moving from the link onto the card is not read as leaving both. */
export const PAGE_PREVIEW_CARD_ATTRIBUTE = 'data-page-preview-card';

export const PAGE_PREVIEW_CARD_STYLE_CLASS = [
  'flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 border border-border bg-surface p-3 text-sm shadow-lg',
].join(' ');

export const PAGE_PREVIEW_TITLE_STYLE_CLASS = 'flex items-center gap-2 font-medium text-foreground';

export const PAGE_PREVIEW_FRAGMENT_STYLE_CLASS = 'line-clamp-3 text-muted-foreground';

export const PAGE_PREVIEW_PROPERTY_ROW_STYLE_CLASS = 'flex items-baseline gap-2 text-xs';

export const PAGE_PREVIEW_PROPERTY_LABEL_STYLE_CLASS = 'shrink-0 text-muted-foreground';

export const PAGE_PREVIEW_PROPERTY_VALUE_STYLE_CLASS = 'truncate text-foreground';

export const PAGE_PREVIEW_STATE_STYLE_CLASS = 'text-muted-foreground';
