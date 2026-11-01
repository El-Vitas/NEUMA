import type { BlockJsonObject } from './block.transaction.domain.types';

/** The values a row of a collection is about to hold, and which of them this transaction wrote. */
export interface RowValueWrite {
  readonly changedKeys: readonly string[];
  readonly collectionId: string;
  readonly rowId: string;
  readonly title: string;
  readonly values: BlockJsonObject;
}

export interface InvalidRowValue {
  readonly message: string;
  readonly rowId: string;
}

export interface StoredFile {
  readonly id: string;
  readonly ownerId: null | string;
  readonly pageId: null | string;
}
