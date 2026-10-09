export const PAGE_ICON_EMOJI_MAX_LENGTH = 16;

export const PAGE_ICON_ACTION_SUBJECT = 'PageIcon';

export const PAGE_ICON_API_ROUTE = (spaceId: string, pageId: string): string =>
  `/api/v1/spaces/${spaceId}/pages/${pageId}/icon`;

export const PAGE_ICON_EMOJI_GRID_LIMIT = 40;
