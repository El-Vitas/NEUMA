import type { PageSchemaProperty } from '../types/pages.schema.types';

/**
 * The other collections whose rows the rollups of this one read. A change in any of them can change a value shown
 * here, so the page follows them too. Only the direct ones: a rollup over a rollup of another collection is not
 * followed down to the third.
 */
export const listComputedSourceCollectionIds = (properties: readonly PageSchemaProperty[]): readonly string[] => {
  const ids = properties.flatMap((property) => property.computed?.rollup?.targetCollectionId ?? []);
  return [...new Set(ids)].sort();
};
