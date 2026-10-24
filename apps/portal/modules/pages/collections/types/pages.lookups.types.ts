import type { PageAttachedFile, PagePersonOption, PageRelatedRow } from './pages.schema.types';

/** The names behind the ids a cell holds. The server resolves them once per reading, so a cell never asks. */
export interface PageCollectionLookups {
  readonly attachedFiles: readonly PageAttachedFile[];
  /** The members of the space, for the filters that name a person. */
  readonly people: readonly PagePersonOption[];
  readonly relatedRows: readonly PageRelatedRow[];
}

/** What a later read of rows adds to the lookups. */
export type PageCollectionLookupsUpdate = Pick<PageCollectionLookups, 'attachedFiles' | 'relatedRows'>;
