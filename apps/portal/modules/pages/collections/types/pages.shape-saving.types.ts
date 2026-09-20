import type { PageSchema, PageSchemaProperty, PageSchemaView } from './pages.schema.types';

/** Mandar la forma de la colección: lo que es del valor y no de una vista sola. */
export interface PagesShapeSaving {
  readonly isSaving: boolean;
  /**
   * Manda la forma y avisa con lo que quedó guardado.
   *
   * Lo que contesta el servidor es la forma de verdad —puede haber limado algo
   * de lo que se mandó—, así que quien guarda un estado propio se queda con eso
   * y no con lo que creía estar mandando.
   */
  readonly save: (
    properties: readonly PageSchemaProperty[],
    views: readonly PageSchemaView[],
    onSaved?: (saved: PageSchema) => void,
  ) => void;
}
