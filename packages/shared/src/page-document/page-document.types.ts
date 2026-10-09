import type { PageContentJson, PageMark } from '../schemas/page-content.schema.js';

/**
 * Cualquier nodo de una página, leído por su forma y no por su nombre: un
 * bloque que esta versión no conoce también tiene que poder leerse.
 */
export interface PageDocumentNodeShape {
  readonly attrs?: { readonly [key: string]: PageContentJson };
  readonly content?: readonly unknown[];
  readonly marks?: readonly PageMark[];
  readonly text?: string;
  readonly type: string;
}

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

/**
 * Dónde van unos bloques: al principio o al final de la página, antes o después
 * de un bloque, o al principio o al final de lo que un bloque lleva dentro.
 */
export type PageBlockPlace =
  | { readonly at: 'end' | 'start' }
  | { readonly after: string }
  | { readonly before: string }
  | { readonly at: 'end' | 'start'; readonly inside: string };

export interface PageDocumentMarkStructure {
  readonly attrs?: PageDocumentAttributes;
  readonly inclusive?: boolean;
}
