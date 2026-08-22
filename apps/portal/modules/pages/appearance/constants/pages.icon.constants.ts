export const PAGE_ICON_EMOJI_MAX_LENGTH = 16;

/** The domain word every page-icon mutation name is built from, so no single action name reads as one opaque token. */
export const PAGE_ICON_ACTION_SUBJECT = 'PageIcon';

export const PAGE_ICON_API_ROUTE = (spaceId: string, pageId: string): string =>
  `/api/v1/spaces/${spaceId}/pages/${pageId}/icon`;

export const PAGE_ICON_EMOJI_GRID_LIMIT = 40;
