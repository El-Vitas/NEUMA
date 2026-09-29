import {
  isPageDocumentNode,
  listPageDocumentChildren,
  readPageDocumentBlockId,
  readPageDocumentNodeStructure,
  readPageDocumentText,
} from '../page-document/page-document.node.lib.js';
import type { PageDocumentNodeShape } from '../page-document/page-document.types.js';
import type { PageContent } from '../schemas/page-content.schema.js';
import {
  PAGE_BLOCK_INLINE_TEXT_ATTRIBUTES,
  PAGE_BLOCK_ITEM_TYPES,
  PAGE_BLOCK_TEXT_ATTRIBUTES,
  PAGE_BLOCK_WHOLE_TYPES,
} from './page-block.constants.js';
import type { PageBlockEntry } from './page-block.types.js';

type Node = PageDocumentNodeShape;

/** Un bloque recién encontrado, antes de saber su lugar en la página y su sección. */
interface FoundBlock {
  readonly headingLevel: number | null;
  readonly id: string;
  readonly parentId: string | null;
  readonly text: string;
  readonly type: string;
}

const isInline = (node: Node): boolean => readPageDocumentNodeStructure(node.type)?.group === 'inline';

const readInlineText = (node: Node): string => {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hard_break') return ' ';
  const named = PAGE_BLOCK_INLINE_TEXT_ATTRIBUTES[node.type];
  if (named !== undefined) return readPageDocumentText(node, named) ?? '';
  return listPageDocumentChildren(node).map(readInlineText).join('');
};

/** Lo que dice un bloque escrito en una línea: sus palabras, si las tiene; si no, nada. */
const readLineText = (node: Node): string => {
  const children = listPageDocumentChildren(node);
  return children.some(isInline) ? children.map(readInlineText).join('') : '';
};

/** Todo lo que dice un bloque y lo que lleva dentro, en el orden en que se lee. */
const readEverythingSaid = (node: Node): readonly string[] => {
  const line = readLineText(node);
  if (line !== '') return [line];
  return listPageDocumentChildren(node).flatMap(readEverythingSaid);
};

const readBlockText = (node: Node): string => {
  if (PAGE_BLOCK_WHOLE_TYPES.includes(node.type)) return readEverythingSaid(node).join(' ');
  if (PAGE_BLOCK_ITEM_TYPES.includes(node.type)) {
    const line = listPageDocumentChildren(node).at(0);
    return line === undefined ? '' : readLineText(line);
  }
  const attribute = PAGE_BLOCK_TEXT_ATTRIBUTES[node.type];
  if (attribute !== undefined) return readPageDocumentText(node, attribute) ?? '';
  return readLineText(node);
};

/** Lo que cuelga de un bloque y se señala por separado. */
const listInnerBlocks = (node: Node): readonly Node[] => {
  if (PAGE_BLOCK_WHOLE_TYPES.includes(node.type)) return [];
  const children = listPageDocumentChildren(node);
  return PAGE_BLOCK_ITEM_TYPES.includes(node.type) ? children.slice(1) : children;
};

const readHeadingLevel = (node: Node): number | null =>
  node.type === 'heading' && typeof node.attrs?.level === 'number' ? node.attrs.level : null;

const findBlocks = (nodes: readonly Node[], parentId: string | null): readonly FoundBlock[] =>
  nodes.flatMap((node) => {
    const id = readPageDocumentBlockId(node);
    const inner = findBlocks(listInnerBlocks(node), id ?? parentId);
    if (id === null) return inner;
    const found: FoundBlock = {
      headingLevel: readHeadingLevel(node),
      id,
      parentId,
      text: readBlockText(node),
      type: node.type,
    };
    return [found, ...inner];
  });

/** Los encabezados abiertos al llegar a un punto de la página, del más externo al más cercano. */
interface OpenHeading {
  readonly level: number;
  readonly text: string;
}

const closeHeadingsAtOrBelow = (open: readonly OpenHeading[], level: number): readonly OpenHeading[] =>
  open.filter((heading) => heading.level < level);

/**
 * Cada bloque con su lugar y su sección.
 *
 * Un encabezado cierra los que tiene del mismo nivel o más adentro y abre el
 * suyo; todo lo que viene después, hasta el próximo que lo cierre, está bajo él.
 */
const placeBlocks = (found: readonly FoundBlock[]): readonly PageBlockEntry[] => {
  const placed: PageBlockEntry[] = [];
  let open: readonly OpenHeading[] = [];
  for (const [position, block] of found.entries()) {
    const withinHeadings = block.headingLevel === null ? open : closeHeadingsAtOrBelow(open, block.headingLevel);
    placed.push({
      headingPath: withinHeadings.map((heading) => heading.text),
      id: block.id,
      parentId: block.parentId,
      position,
      text: block.text,
      type: block.type,
    });
    if (block.headingLevel !== null) open = [...withinHeadings, { level: block.headingLevel, text: block.text }];
  }
  return placed;
};

/**
 * Los bloques de una página, en el orden en que se lee.
 *
 * Se señalan igual que en su Markdown con ids: un ítem de una lista por el
 * ítem, y una tabla entera como un bloque. Así el id que encuentra la búsqueda
 * es el mismo que el agente ve al leer la página.
 */
export const listPageBlocks = (content: PageContent): readonly PageBlockEntry[] =>
  placeBlocks(findBlocks(content.content.filter(isPageDocumentNode), null));
