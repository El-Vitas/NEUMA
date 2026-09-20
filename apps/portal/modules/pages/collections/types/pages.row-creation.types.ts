import type { PageSchemaProperty } from './pages.schema.types';

/** Con qué se crea una fila desde el sitio donde va a vivir. */
export interface PagesRowCreationInput {
  /** La segunda agrupación, cuando el tablero está en rejilla: una fila nace en su cruce, no solo en su columna. */
  readonly bandedByKey?: string;
  readonly collectionPageId: string;
  /** Qué propiedad dice ese sitio: la que hace las columnas de un tablero, la fecha de un calendario. */
  readonly placedByKey: string;
  /** Lo que la colección guarda, para que la fila nazca respondiendo lo que se da por sentado. */
  readonly properties: readonly PageSchemaProperty[];
  readonly spaceId: string;
}

export interface PagesRowCreation {
  readonly createRowIn: (placedValue: string, title: string, bandValue?: string) => void;
  readonly isCreating: boolean;
}
