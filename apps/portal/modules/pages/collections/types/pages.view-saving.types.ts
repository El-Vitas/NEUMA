import type { PageSchemaViewDraft } from './pages.schema.types';

export interface PagesViewSaving {
  readonly apply: (rewrite: (current: readonly PageSchemaViewDraft[]) => readonly PageSchemaViewDraft[]) => void;
  readonly isSaving: boolean;
  /** Includes changes still in flight to the server. */
  readonly views: readonly PageSchemaViewDraft[];
}
