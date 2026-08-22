import type { PagePersonOption } from '../../../types/pages.schema.types';

/** Who is named here, and what they were called at the time. */
export interface PagePersonInsert {
  readonly label: string;
  readonly userId: string;
}

/** What the person node view needs to say more than a name once the pointer rests on it. */
export interface PagePersonHoverInfo {
  readonly findMember: (userId: string) => PagePersonOption | undefined;
}

/** The members answering a name as somebody types it, and whether that answer is still on its way. */
export interface PagePersonSearchResult {
  readonly candidates: readonly PagePersonOption[];
  readonly isLoading: boolean;
}
