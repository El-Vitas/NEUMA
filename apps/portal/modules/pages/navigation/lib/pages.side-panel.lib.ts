import {
  INTERNAL_PAGE_HREF_PATTERN,
  PAGES_SIDE_PANEL_MAX_WIDTH_PX,
  PAGES_SIDE_PANEL_MIN_WIDTH_PX,
  PAGES_SIDE_PANEL_SEARCH_PARAM,
} from '../constants/pages.side-panel.constants';

export const clampPagesSidePanelWidth = (width: number): number =>
  Math.min(PAGES_SIDE_PANEL_MAX_WIDTH_PX, Math.max(PAGES_SIDE_PANEL_MIN_WIDTH_PX, width));

/**
 * The address with a page riding along beside the one it already names.
 *
 * Every other question the address answers keeps answering it: only the one
 * parameter that names the panel is replaced, so a filter or a search term
 * already written into the address survives opening a page beside it.
 */
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

/**
 * A relative address a row can point at without knowing the page it stands on.
 *
 * Lleva consigo lo que la dirección ya preguntaba: abrir una fila al costado no
 * es cambiar de vista, y una dirección que solo nombrara el panel devolvería la
 * colección a su vista de siempre en cuanto se abre una tarjeta del tablero.
 */
export const buildPagesSidePanelQueryHref = (search: string, pageId: string): string =>
  `?${withPagesSidePanelParam(search, pageId)}`;

/** A path with its search attached, without a dangling `?` when there is nothing left to ask. */
export const buildAddressWithSearch = (pathname: string, search: string): string =>
  search === '' ? pathname : `${pathname}?${search}`;

/** The space and page a written link points at, when it points at a page of this app at all. */
export const resolveInternalPageHref = (href: string): { readonly pageId: string; readonly spaceId: string } | null => {
  const match = INTERNAL_PAGE_HREF_PATTERN.exec(href);
  if (match === null) return null;
  const [, spaceId, pageId] = match;
  if (spaceId === undefined || pageId === undefined) return null;
  return { pageId, spaceId };
};
