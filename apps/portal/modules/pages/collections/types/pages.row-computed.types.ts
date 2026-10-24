import type { PageComputedError, PagePropertyValue } from './pages.schema.types';

export interface RowEdit {
  readonly key: string;
  readonly value: PagePropertyValue | undefined;
}

export type RowEdits = Readonly<Record<string, PagePropertyValue | undefined>>;

export interface PagesRowComputed {
  /** Why the property could not be computed in this row, if it could not. */
  readonly errorOf: (propertyKey: string) => PageComputedError | undefined;
  /** To be called, inside the transition of a save, with the value being written. */
  readonly onWriting: (propertyKey: string, value: PagePropertyValue | undefined) => void;
  readonly valueOf: (propertyKey: string) => PagePropertyValue | undefined;
}
