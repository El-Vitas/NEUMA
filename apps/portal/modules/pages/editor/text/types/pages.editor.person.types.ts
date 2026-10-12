import type { PagePersonOption } from '../../../collections/types/pages.schema.types';

export interface PagePersonInsert {
  readonly label: string;
  readonly userId: string;
}

export interface PagePersonHoverInfo {
  readonly findMember: (userId: string) => PagePersonOption | undefined;
}

export interface PagePersonSearchResult {
  readonly candidates: readonly PagePersonOption[];
  readonly isLoading: boolean;
}
