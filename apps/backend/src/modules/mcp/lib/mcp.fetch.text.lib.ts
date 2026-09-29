import type {
  McpFetchedBlock as FetchedBlock,
  McpFetchedPage as FetchedPage,
  McpFetchOutput,
} from '../types/mcp.types';

const describePath = (page: FetchedPage): string => [...page.path.map((step) => step.title), page.title].join(' › ');

const describeChildren = (page: FetchedPage): string => {
  if (page.children === undefined || page.children.length === 0) return '';
  const lines = page.children.map((child) => {
    const kind = child.isCollection ? 'collection' : 'page';
    return `- ${child.title} (${kind} ${child.id}, ${String(child.childCount)} under it) ${child.url}`;
  });
  return `Pages under this one:\n${lines.join('\n')}`;
};

const describeBacklinks = (page: FetchedPage): string => {
  if (page.backlinks === undefined || page.backlinks.length === 0) return '';
  return `Linked from:\n${page.backlinks.map((link) => `- ${link.title} ${link.url}`).join('\n')}`;
};

const describePropertyValue = (value: NonNullable<FetchedPage['properties']>[number]['value']): string => {
  if (value === null) return '(empty)';
  return Array.isArray(value) ? value.join(', ') : String(value);
};

const describeProperties = (page: FetchedPage): string => {
  if (page.properties === undefined || page.properties.length === 0) return '';
  const lines = page.properties.map(
    (property) => `- ${property.label} (${property.key}, ${property.type}): ${describePropertyValue(property.value)}`,
  );
  return `Properties:\n${lines.join('\n')}`;
};

const describeComments = (page: FetchedPage): string => {
  if (page.comments === undefined || page.comments.length === 0) return '';
  const lines = page.comments.map(
    (comment) => `- ${comment.author} on block ${comment.blockId} (${comment.createdAt}): ${comment.body}`,
  );
  return `Comments:\n${lines.join('\n')}`;
};

const describeNextPart = (page: FetchedPage): string =>
  page.nextCursor === undefined ? '' : `The page goes on: fetch it again with cursor ${page.nextCursor}.`;

const writePage = (page: FetchedPage): readonly string[] => [
  `# ${page.title}`,
  `Page ${page.id} · ${describePath(page)}\n${page.url}`,
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
