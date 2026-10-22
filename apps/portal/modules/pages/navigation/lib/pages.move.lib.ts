import { PAGE_MOVE_SPACE_ROOT_PREFIX } from '../constants/pages.move.constants';
import type {
  PageMoveCandidatePage,
  PageMoveDestination,
  PageMoveDestinations,
  PageMoveSpace,
} from '../types/pages.move.types';

const nameTitle = (title: string, untitledLabel: string): string => (title.trim().length > 0 ? title : untitledLabel);

const namePage = (page: PageMoveCandidatePage, untitledLabel: string): string => nameTitle(page.title, untitledLabel);

const toSpaceRootDestination = (space: PageMoveSpace, rootLabel: string): PageMoveDestination => ({
  id: `${PAGE_MOVE_SPACE_ROOT_PREFIX}${space.id}`,
  pageId: null,
  spaceId: space.id,
  spaceName: space.name,
  title: rootLabel,
});

/**
 * While nothing is typed each space's root precedes its pages, matching tree order. Once something is, the server
 * has already chosen what matches, so only those pages are offered.
 */
export const buildPageMoveDestinations = (
  destinations: PageMoveDestinations,
  query: string,
  rootLabel: string,
  untitledLabel: string,
): readonly PageMoveDestination[] =>
  destinations.spaces.flatMap((space) => [
    ...(query === '' ? [toSpaceRootDestination(space, rootLabel)] : []),
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

/** Where the page is now; unknown until the spaces are, and the parent is only known by the title the server gave. */
export const describeCurrentPageMoveDestination = (
  destinations: PageMoveDestinations,
  spaceId: string,
  parentId: string | null,
  rootLabel: string,
  untitledLabel: string,
): PageMoveDestination | null => {
  const space = destinations.spaces.find((candidate) => candidate.id === spaceId);
  if (space === undefined) return null;
  if (parentId === null) return toSpaceRootDestination(space, rootLabel);
  return {
    id: parentId,
    pageId: parentId,
    spaceId,
    spaceName: space.name,
    title: nameTitle(destinations.parentTitle ?? '', untitledLabel),
  };
};

export const isSamePageMoveDestination = (
  destination: PageMoveDestination,
  spaceId: string,
  parentId: string | null,
): boolean => destination.spaceId === spaceId && destination.pageId === parentId;
