/** How long the pointer has to stay before a preview is worth showing, so passing over a link does not flash one. */
export const PAGE_PREVIEW_OPEN_DELAY_MS = 500;

/**
 * How long a preview is kept once the pointer has left.
 *
 * Between the link and the card there is writing, and crossing it is how one
 * gets to read the card. The wait has to outlast that crossing done at a
 * reading pace, not at the pace of somebody who already knew where to aim.
 */
export const PAGE_PREVIEW_CLOSE_DELAY_MS = 400;

/** Long enough to say what a page holds, short enough that a glance is still a glance. */
export const PAGE_PREVIEW_FRAGMENT_LIMIT = 240;

/** How far under the link the preview stands, past where a link's own bubble already stands. */
export const PAGE_PREVIEW_GAP_PX = 40;

/** The page a link to `pages/new` names is not written yet, so it has nothing to preview. */
export const PAGE_PREVIEW_NEW_PAGE_SEGMENT = 'new';

/** A link that stays inside this app rather than leaving it: `/spaces/:spaceId/pages/:pageId`. */
export const PAGE_PREVIEW_INTERNAL_HREF = /^\/spaces\/([^/?#]+)\/pages\/([^/?#]+)$/;

/** The mark a page wears at the front of its own name, if it wears one at all. */
export const PAGE_PREVIEW_LEADING_ICON = /^\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/u;

export const PAGE_PREVIEW_WHITESPACE = /\s+/g;

/** Marks the card itself, so the pointer leaving a link onto the card it opened is not read as leaving both. */
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
