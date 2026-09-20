import type { PageSchemaView } from './pages.schema.types';

/** Cambiar lo que una vista dice de sí misma, y que quede guardado. */
export interface PagesViewSaving {
  readonly apply: (rewrite: (current: readonly PageSchemaView[]) => readonly PageSchemaView[]) => void;
  readonly isSaving: boolean;
  /** Como están ahora, contando lo que todavía viaja hacia el servidor. */
  readonly views: readonly PageSchemaView[];
}
