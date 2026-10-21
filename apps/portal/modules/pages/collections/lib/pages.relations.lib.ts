import { PAGE_RELATION_PICKER_VISIBLE_LIMIT } from '../constants/pages.relations.constants';
import type { PageRelatedRow } from '../types/pages.schema.types';

/** The rows the picker offers: those not yet chosen whose title holds what was typed, up to a screenful. */
export const listRelationCandidatesToShow = (
  candidates: readonly PageRelatedRow[] | null,
  chosenIds: readonly string[],
  query: string,
): readonly PageRelatedRow[] => {
  const typed = query.trim().toLowerCase();
  return (candidates ?? [])
    .filter((row) => !chosenIds.includes(row.id) && row.title.toLowerCase().includes(typed))
    .slice(0, PAGE_RELATION_PICKER_VISIBLE_LIMIT);
};
