import type { PageSchemaProperty, PageSchemaView } from './pages.schema.types';

/** Mandar la forma de la colección: lo que es del valor y no de una vista sola. */
export interface PagesShapeSaving {
  readonly isSaving: boolean;
  readonly save: (properties: readonly PageSchemaProperty[], views: readonly PageSchemaView[]) => void;
}
