import {
  isKnownPageContentNode,
  PAGE_CONTENT_SCHEMA_VERSION,
  type PageContent,
  type PageContentNode,
  pageContentSchema,
} from '../schemas/page-content.schema.js';
import {
  PAGE_DOCUMENT_LEAF_NODES,
  PAGE_DOCUMENT_ONLY_WHEN_BEYOND_ONE_ATTRIBUTES,
  PAGE_DOCUMENT_ONLY_WHEN_TRUE_ATTRIBUTES,
} from './page-document.constants.js';
import { PAGE_DOCUMENT_UNSUPPORTED_NODE } from './page-document.structure.js';

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isUnsupportedBlock = (node: Record<string, unknown>): boolean => node.type === PAGE_DOCUMENT_UNSUPPORTED_NODE;

/**
 * Un bloque que esta versión no conoce, convertido en uno que sí puede tener:
 * el tipo que dice ser y el bloque entero, palabra por palabra.
 */
const holdUnknownBlock = (node: PageContentNode): PageContentNode => ({
  attrs: { name: node.type, source: JSON.stringify(node) },
  type: PAGE_DOCUMENT_UNSUPPORTED_NODE,
});

const holdUnknownBlocks = (nodes: readonly PageContentNode[]): readonly PageContentNode[] =>
  nodes.map((node) => {
    if (!isKnownPageContentNode(node)) return holdUnknownBlock(node);
    if (!('content' in node) || node.type === 'paragraph' || node.type === 'heading' || node.type === 'code_block') {
      return node;
    }
    return { ...node, content: [...holdUnknownBlocks(node.content)] };
  });

/**
 * La página como la puede leer el documento del editor.
 *
 * Lo que esta versión no conoce pasa a ser un marcador que lleva el original,
 * así la página se abre entera en vez de fallar por el único bloque que nadie
 * aquí entiende.
 */
export const holdPageContentThisVersionCannotRead = (content: PageContent): PageContent => ({
  ...content,
  content: [...holdUnknownBlocks(content.content)],
});

/** Lo que el marcador guardaba, sacado de vuelta. */
const releaseUnknownBlock = (node: Record<string, unknown>): Record<string, unknown> => {
  const source = isJsonObject(node.attrs) ? node.attrs.source : null;
  if (typeof source !== 'string') return node;
  const original: unknown = JSON.parse(source);
  return isJsonObject(original) ? original : node;
};

const releaseUnknownBlocks = (nodes: readonly unknown[]): readonly unknown[] =>
  nodes.map((node) => {
    if (!isJsonObject(node)) return node;
    if (isUnsupportedBlock(node)) return releaseUnknownBlock(node);
    if (!Array.isArray(node.content)) return node;
    return { ...node, content: releaseUnknownBlocks(node.content) };
  });

const releasePageContentThisVersionCannotRead = (document: Record<string, unknown>): Record<string, unknown> =>
  Array.isArray(document.content) ? { ...document, content: releaseUnknownBlocks(document.content) } : document;

const saysSomething = ([key, value]: readonly [string, unknown]): boolean => {
  if (value === null) return false;
  if (PAGE_DOCUMENT_ONLY_WHEN_TRUE_ATTRIBUTES.includes(key) && value === false) return false;
  return !(PAGE_DOCUMENT_ONLY_WHEN_BEYOND_ONE_ATTRIBUTES.includes(key) && value === 1);
};

const normalizeAttrs = (value: unknown): Record<string, unknown> =>
  isJsonObject(value) ? Object.fromEntries(Object.entries(value).filter(saysSomething)) : {};

const isEmptyNormalizedAttrs = (key: string, value: unknown): boolean =>
  key === 'attrs' && isJsonObject(value) && Object.keys(value).length === 0;

const isContainerNode = (value: unknown): boolean =>
  typeof value === 'string' && !PAGE_DOCUMENT_LEAF_NODES.includes(value);

const normalizeEntry = (key: string, value: unknown): unknown => {
  if (key === 'attrs') return normalizeAttrs(value);
  if (key === 'content') return normalizeContent(value);
  return value;
};

const normalizeContent = (value: unknown): unknown =>
  Array.isArray(value) ? value.map((child) => normalizeDocumentJson(child)) : value;

const normalizeDocumentJson = (value: unknown): Record<string, unknown> => {
  if (!isJsonObject(value)) return {};
  const normalized = Object.fromEntries(
    Object.entries(value)
      .map(([key, entryValue]) => [key, normalizeEntry(key, entryValue)] as const)
      .filter(([key, entryValue]) => !isEmptyNormalizedAttrs(key, entryValue)),
  );
  if (isContainerNode(value.type) && !('content' in value)) normalized.content = [];
  return normalized;
};

/**
 * El documento del editor, tal como sale de ProseMirror, en la forma en que se
 * guarda una página: sin los atributos que no dicen nada y con los bloques
 * desconocidos devueltos como llegaron. Todavía sin validar.
 */
const prepareDocumentJsonForStorage = (documentJson: unknown): Record<string, unknown> => ({
  ...releasePageContentThisVersionCannotRead(normalizeDocumentJson(documentJson)),
  schemaVersion: PAGE_CONTENT_SCHEMA_VERSION,
});

/** Lo que del documento se puede guardar, o nada si no calza con el contrato de una página. */
export const readPageDocumentJsonAsContent = (documentJson: unknown): PageContent | null => {
  const kept = pageContentSchema.safeParse(prepareDocumentJsonForStorage(documentJson));
  return kept.success ? kept.data : null;
};

/** El documento escrito como se guarda una página. Lo que no calza se rechaza, nunca se guarda a medias. */
export const writePageDocumentJsonAsContent = (documentJson: unknown): PageContent =>
  pageContentSchema.parse(prepareDocumentJsonForStorage(documentJson));
