import type { PageDestination } from '../types/pages.editor.destination.types';

/**
 * The pages whose name answers to what is being typed, in the order they were
 * given. An empty question offers them all: the list is the space's own pages,
 * short enough to read.
 */
export const findPageDestinations = (
  destinations: readonly PageDestination[],
  query: string,
): readonly PageDestination[] => {
  const asked = query.trim().toLocaleLowerCase();
  if (asked.length === 0) return destinations;
  return destinations.filter((destination) => destination.label.toLocaleLowerCase().includes(asked));
};
