import type { PageSibling } from './page.domain.types';

const compareByCreation = (first: PageSibling, second: PageSibling): number =>
  first.createdAt.getTime() - second.createdAt.getTime() || first.id.localeCompare(second.id);

/** The pages in the order their parent lists them; the ones it does not list yet come last, by when they were made. */
export const orderBySiblingPosition = <Page extends PageSibling>(
  siblings: readonly Page[],
  listedIds: readonly string[],
): Page[] => {
  const positions = new Map(listedIds.map((id, position) => [id, position]));
  const positionOf = (page: Page): number => positions.get(page.id) ?? positions.size;
  return siblings.toSorted(
    (first, second) => positionOf(first) - positionOf(second) || compareByCreation(first, second),
  );
};
