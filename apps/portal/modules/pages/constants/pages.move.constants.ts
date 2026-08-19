import type { PageMoveDestinations } from '../types/pages.move.types';

/** What tells the root of a space apart from a page, since neither shares the other's id. */
export const PAGE_MOVE_SPACE_ROOT_PREFIX = 'space:';

export const NO_PAGE_MOVE_DESTINATIONS: PageMoveDestinations = { pages: [], spaces: [] };
