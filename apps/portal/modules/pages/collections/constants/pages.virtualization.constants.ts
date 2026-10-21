/** The area of the portal that scrolls the page; the lists of a collection follow its scroll, not the window's. */
export const PAGE_SCROLL_CONTAINER_SELECTOR = '[data-scroll-container]';

/** Before any item is drawn, no height is known. */
export const NO_MEASURED_HEIGHTS: ReadonlyMap<number, number> = new Map();

/** Items drawn above and below what is in view, so scrolling fast does not show blank space before they arrive. */
export const PAGE_VIRTUAL_OVERSCAN = 10;

/** Past this many items a list is windowed; a shorter one is drawn whole. */
export const PAGE_VIRTUAL_THRESHOLD = 60;

/** Pixels: what a card, a row or an item of a list is assumed to measure until it has been drawn and measured. */
export const PAGE_VIRTUAL_CARD_HEIGHT = 112;

export const PAGE_VIRTUAL_ROW_HEIGHT = 44;

export const PAGE_VIRTUAL_LIST_ITEM_HEIGHT = 56;
