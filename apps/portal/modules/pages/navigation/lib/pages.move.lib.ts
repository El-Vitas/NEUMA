import { PAGE_MOVE_SPACE_ROOT_PREFIX } from '../constants/pages.move.constants';
import type {
  PageMoveCandidatePage,
  PageMoveDestination,
  PageMoveDestinations,
  PageMoveSpace,
} from '../types/pages.move.types';

const namePage = (page: PageMoveCandidatePage, untitledLabel: string): string =>
  page.title.trim().length > 0 ? page.title : untitledLabel;

const toSpaceRootDestination = (space: PageMoveSpace, rootLabel: string): PageMoveDestination => ({
  id: `${PAGE_MOVE_SPACE_ROOT_PREFIX}${space.id}`,
  pageId: null,
  spaceId: space.id,
  spaceName: space.name,
  title: rootLabel,
});

/** Each space's root precedes its pages, matching tree order. */
export const buildPageMoveDestinations = (
  destinations: PageMoveDestinations,
  rootLabel: string,
  untitledLabel: string,
): readonly PageMoveDestination[] =>
  destinations.spaces.flatMap((space) => [
    toSpaceRootDestination(space, rootLabel),
    ...destinations.pages
      .filter((page) => page.spaceId === space.id)
      .map((page) => ({
        id: page.id,
        pageId: page.id,
        spaceId: space.id,
        spaceName: space.name,
        title: namePage(page, untitledLabel),
      })),
  ]);

export const findCurrentPageMoveDestination = (
  destinations: readonly PageMoveDestination[],
  spaceId: string,
  parentId: string | null,
): PageMoveDestination | null =>
  destinations.find((destination) => destination.spaceId === spaceId && destination.pageId === parentId) ?? null;

export const isSamePageMoveDestination = (
  destination: PageMoveDestination,
  spaceId: string,
  parentId: string | null,
): boolean => destination.spaceId === spaceId && destination.pageId === parentId;
