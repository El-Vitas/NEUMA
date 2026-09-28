/** Un atributo de un nodo o una marca. Sin valor por defecto, es obligatorio. */
export interface PageDocumentAttributeStructure {
  readonly default?: unknown;
}

export type PageDocumentAttributes = Readonly<Record<string, PageDocumentAttributeStructure>>;

/**
 * Lo que un tipo de nodo dice de la forma del documento: qué atributos lleva,
 * qué puede contener, en qué grupo cuenta y qué marcas admite. Cómo se dibuja o
 * cómo se comporta al editar no está aquí, porque eso es del editor.
 */
export interface PageDocumentNodeStructure {
  readonly attrs?: PageDocumentAttributes;
  readonly content?: string;
  readonly group?: string;
  readonly inline?: boolean;
  readonly marks?: string;
}

export interface PageDocumentMarkStructure {
  readonly attrs?: PageDocumentAttributes;
  readonly inclusive?: boolean;
}
