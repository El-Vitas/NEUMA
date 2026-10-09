import type { PageSchemaView } from './pages.schema.types';

export interface PagesViewSaving {
  readonly apply: (rewrite: (current: readonly PageSchemaView[]) => readonly PageSchemaView[]) => void;
  readonly isSaving: boolean;
  /** Includes changes still in flight to the server. */
  readonly views: readonly PageSchemaView[];
}
