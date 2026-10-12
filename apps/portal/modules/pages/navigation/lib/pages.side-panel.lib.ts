import {
  INTERNAL_PAGE_HREF_PATTERN,
  PAGES_SIDE_PANEL_MAX_WIDTH_PX,
  PAGES_SIDE_PANEL_MIN_WIDTH_PX,
  PAGES_SIDE_PANEL_SEARCH_PARAM,
} from '../constants/pages.side-panel.constants';

export const clampPagesSidePanelWidth = (width: number): number =>
  Math.min(PAGES_SIDE_PANEL_MAX_WIDTH_PX, Math.max(PAGES_SIDE_PANEL_MIN_WIDTH_PX, width));

/** Replaces only the panel parameter, so filters and search terms in the address survive. */
export const withPagesSidePanelParam = (search: string, pageId: string): string => {
  const params = new URLSearchParams(search);
  params.set(PAGES_SIDE_PANEL_SEARCH_PARAM, pageId);
  return params.toString();
};

export const withoutPagesSidePanelParam = (search: string): string => {
  const params = new URLSearchParams(search);
  params.delete(PAGES_SIDE_PANEL_SEARCH_PARAM);
  return params.toString();
};

/** Keeps the current query: a link naming only the panel would reset the collection to its default view. */
export const buildPagesSidePanelQueryHref = (search: string, pageId: string): string =>
  `?${withPagesSidePanelParam(search, pageId)}`;

export const buildAddressWithSearch = (pathname: string, search: string): string =>
  search === '' ? pathname : `${pathname}?${search}`;

export const resolveInternalPageHref = (href: string): { readonly pageId: string; readonly spaceId: string } | null => {
  const match = INTERNAL_PAGE_HREF_PATTERN.exec(href);
  if (match === null) return null;
  const [, spaceId, pageId] = match;
  if (spaceId === undefined || pageId === undefined) return null;
  return { pageId, spaceId };
};
