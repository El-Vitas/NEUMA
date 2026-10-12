import type { PageSchema, PageSchemaProperty, PageSchemaView } from './pages.schema.types';

export interface PagesShapeSaving {
  readonly isSaving: boolean;
  /** `onSaved` receives the server's version, which may differ from what was sent. */
  readonly save: (
    properties: readonly PageSchemaProperty[],
    views: readonly PageSchemaView[],
    onSaved?: (saved: PageSchema) => void,
  ) => void;
}
