import type { PagePropertyValues } from '@neuma/shared';
import type { PageComputedError, PagePropertyValue, PageSchemaProperty } from './pages.schema.types';

export interface RowFormulaRecomputeInput {
  /** The keys of the stored properties the person just changed. */
  readonly editedKeys: ReadonlySet<string>;
  readonly properties: readonly PageSchemaProperty[];
  /** The values of the row with the change already applied. */
  readonly values: PagePropertyValues;
}

/** What a formula of the row shows right after the change, until the server answers with its own computation. */
export interface RowFormulaRecomputed {
  readonly errors: Readonly<Record<string, PageComputedError>>;
  readonly values: Readonly<Record<string, PagePropertyValue | undefined>>;
}
