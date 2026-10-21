import type { PageRelatedRow } from './pages.schema.types';

export interface PagesRelationEditingInput {
  /** The collection the relation points to. */
  readonly collectionId: string;
  readonly propertyKey: string;
  readonly rowId: string;
  readonly spaceId: string;
  readonly value: readonly string[];
}

export interface PagesRelationEditing {
  readonly add: (target: PageRelatedRow) => void;
  /** Null until the picker has been opened once. */
  readonly candidates: readonly PageRelatedRow[] | null;
  readonly isChanging: boolean;
  /** Asks the server for the rows that hold what was typed; an answer to an older question is dropped. */
  readonly loadCandidates: (search?: string) => void;
  readonly remove: (target: PageRelatedRow) => void;
  /** The rows the cell points to, with the title of each when it is known. */
  readonly shown: readonly PageRelatedRow[];
}
