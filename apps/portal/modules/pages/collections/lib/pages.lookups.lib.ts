import type { PageCollectionLookups, PageCollectionLookupsUpdate } from '../types/pages.lookups.types';

const mergeById = <TEntry extends { readonly id: string }>(
  held: readonly TEntry[],
  added: readonly TEntry[],
): readonly TEntry[] => {
  const known = new Set(held.map((entry) => entry.id));
  const fresh = added.filter((entry) => !known.has(entry.id));
  return fresh.length === 0 ? held : [...held, ...fresh];
};

/** Adds what a later page of rows needs to the lookups, keeping the ones already held. */
export const mergeCollectionLookups = (
  held: PageCollectionLookups,
  update: PageCollectionLookupsUpdate,
): PageCollectionLookups => ({
  ...held,
  attachedFiles: mergeById(held.attachedFiles, update.attachedFiles),
  relatedRows: mergeById(held.relatedRows, update.relatedRows),
});
