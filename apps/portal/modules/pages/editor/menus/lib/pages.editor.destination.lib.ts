import type { PageDestination } from '../types/pages.editor.destination.types';

export const findPageDestinations = (
  destinations: readonly PageDestination[],
  query: string,
): readonly PageDestination[] => {
  const asked = query.trim().toLocaleLowerCase();
  if (asked.length === 0) return destinations;
  return destinations.filter((destination) => destination.label.toLocaleLowerCase().includes(asked));
};
