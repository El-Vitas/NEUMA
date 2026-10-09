import { PAGE_DOCUMENT_NODES } from './page-document.structure.js';
import type { PageDocumentNodeShape, PageDocumentNodeStructure } from './page-document.types.js';

const NODE_STRUCTURES: Readonly<Partial<Record<string, PageDocumentNodeStructure>>> = PAGE_DOCUMENT_NODES;

/** Lo que el esquema dice de un tipo de nodo, o nada si esta versión no lo conoce. */
export const readPageDocumentNodeStructure = (type: string): PageDocumentNodeStructure | undefined =>
  NODE_STRUCTURES[type];

export const isPageDocumentNode = (value: unknown): value is PageDocumentNodeShape =>
  typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string';

/**
 * Lo que cuelga dentro de un nodo, quedándose solo con lo que es nodo.
 *
 * Un bloque que esta versión no conoce guarda lo de adentro como datos sueltos,
 * y un dato suelto puede ser un número o nada. Preguntarlo aquí y no en cada
 * lector deja la pregunta en un solo lugar.
 */
export const listPageDocumentChildren = (node: PageDocumentNodeShape): readonly PageDocumentNodeShape[] =>
  (node.content ?? []).filter(isPageDocumentNode);

export const readPageDocumentText = (node: PageDocumentNodeShape, name: string): string | undefined => {
  const attribute = node.attrs?.[name];
  return typeof attribute === 'string' ? attribute : undefined;
};

/** El id de un bloque, si lo tiene. */
export const readPageDocumentBlockId = (node: PageDocumentNodeShape): string | null =>
  readPageDocumentText(node, 'id') ?? null;
