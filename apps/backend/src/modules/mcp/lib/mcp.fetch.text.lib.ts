import { DatabasePropertyType } from '@company-brain/db';
import type {
  McpFetchedBlock as FetchedBlock,
  McpFetchedPage as FetchedPage,
  McpFetchedProperty as FetchedProperty,
  McpFetchOutput,
} from '../types/mcp.types';
import { formatMcpPageState } from './mcp.page-state.lib';

const describePath = (page: FetchedPage): string => [...page.path.map((step) => step.title), page.title].join(' › ');

/**
 * Una página del árbol en una línea. De una colección se dice cuántas filas
 * tiene, no cuántas páginas: leído como «4 debajo», un tablero de cuatro
 * tareas se entendía como uno de cuatro columnas.
 */
export const describeMcpOutlinePage = (page: {
  readonly childCount: number;
  readonly id: string;
  readonly isCollection: boolean;
  readonly title: string;
  readonly url: string;
}): string => {
  const kind = page.isCollection ? 'collection' : 'page';
  const holds = page.isCollection ? 'rows' : 'pages under it';
  return `- ${page.title} (${kind} ${page.id}, ${String(page.childCount)} ${holds}) ${page.url}`;
};

const describeChildren = (page: FetchedPage): string => {
  if (page.children === undefined || page.children.length === 0) return '';
  const more =
    page.moreChildren === undefined
      ? ''
      : `\n…and ${String(page.moreChildren)} more: list_pages with parentPageId ${page.id} goes through all of them.`;
  return `Pages under this one:\n${page.children.map(describeMcpOutlinePage).join('\n')}${more}`;
};

const describeBacklinks = (page: FetchedPage): string => {
  if (page.backlinks === undefined || page.backlinks.length === 0) return '';
  const lines = page.backlinks.map((link) => `- ${link.title} ${link.url}`);
  return `Linked from:\n${lines.join('\n')}`;
};

/** Lo que dice una propiedad: las personas por su nombre, lo demás tal cual. */
const describePropertyValue = (property: FetchedProperty): string => {
  if (property.people !== undefined && property.people.length > 0)
    return property.people.map((person) => `${person.name} (${person.id})`).join(', ');
  if (property.value === null) return '(empty)';
  return Array.isArray(property.value) ? property.value.join(', ') : String(property.value);
};

/**
 * Las propiedades de una fila en una línea, sin la del título, que ya va como
 * nombre de la fila. Es lo que se lee al recorrer un tablero, fila por fila.
 */
export const describeMcpRowPropertiesInOneLine = (properties: readonly FetchedProperty[]): string =>
  properties
    .filter((property) => property.type !== DatabasePropertyType.TITLE)
    .map((property) => `${property.label}: ${describePropertyValue(property)}`)
    .join(' · ');

const describeProperties = (page: FetchedPage): string => {
  if (page.properties === undefined || page.properties.length === 0) return '';
  const lines = page.properties.map(
    (property) => `- ${property.label} (${property.key}, ${property.type}): ${describePropertyValue(property)}`,
  );
  return `Properties:\n${lines.join('\n')}`;
};

const describeComments = (page: FetchedPage): string => {
  if (page.comments === undefined || page.comments.length === 0) return '';
  const lines = page.comments.map(
    (comment) =>
      `- Comment ${comment.id} by ${comment.author} on block ${comment.blockId} (${comment.createdAt}): ${comment.body}`,
  );
  return `Comments:\n${lines.join('\n')}`;
};

const describeNextPart = (page: FetchedPage): string =>
  page.nextCursor === undefined ? '' : `The page goes on: fetch it again with cursor ${page.nextCursor}.`;

const writePage = (page: FetchedPage): readonly string[] => [
  `# ${page.title}`,
  `Page ${page.id} · ${describePath(page)}\n${page.url}`,
  page.state === undefined ? '' : formatMcpPageState(page.state),
  describeProperties(page),
  page.markdown ?? '',
  describeNextPart(page),
  describeComments(page),
  describeChildren(page),
  describeBacklinks(page),
];

const writeBlock = (block: FetchedBlock, page: FetchedPage): readonly string[] => [
  `Block ${block.id} (${block.type}) in ${[describePath(page), ...block.section].join(' › ')}\n${block.url}`,
  block.markdown,
  `The whole page: ${page.url} (page ${page.id})`,
];

/**
 * Lo que lee el modelo al abrir algo.
 *
 * Una página va en Markdown con el id de cada bloque, seguida de lo que cuelga
 * de ella y de quién la enlaza. Un bloque va con dónde está y cómo abrir su
 * página entera. Una nota, si la hay, va primero: cambia cómo leer el resto.
 */
export const formatMcpFetchText = (output: McpFetchOutput): string =>
  [output.note ?? '', ...(output.block === undefined ? writePage(output.page) : writeBlock(output.block, output.page))]
    .filter((part) => part !== '')
    .join('\n\n');
