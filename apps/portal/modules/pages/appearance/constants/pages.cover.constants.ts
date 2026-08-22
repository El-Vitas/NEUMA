export const PAGE_COVER_POSITION_MIN = 0;
export const PAGE_COVER_POSITION_MAX = 100;
export const PAGE_COVER_DEFAULT_POSITION = 50;

/** How far one arrow key nudges the framing, so a cover can be placed without a pointer. */
export const PAGE_COVER_KEYBOARD_STEP = 5;

export const PAGE_COVER_API_ROUTE = (spaceId: string, pageId: string): string =>
  `/api/v1/spaces/${spaceId}/pages/${pageId}/cover`;
