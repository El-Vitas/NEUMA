import {
  MARKDOWN_BLOCK_ANCHOR_CLOSE,
  MARKDOWN_BLOCK_ANCHOR_OPEN,
  MARKDOWN_BLOCK_SEPARATOR,
  MARKDOWN_DIRECTIVE_FENCE,
  MARKDOWN_MARK_WRAPPERS,
} from './constants/page-markdown.constants.js';
import {
  isPageDocumentNode,
  listPageDocumentChildren,
  readPageDocumentBlockId,
  readPageDocumentText,
} from './page-document/page-document.node.lib.js';
import type { PageDocumentNodeShape } from './page-document/page-document.types.js';
import type { PageContent } from './schemas/page-content.schema.js';

type AnyNode = PageDocumentNodeShape;

/** Cómo se presenta un bloque ya escrito: tal cual, o con su id delante. */
type BlockAnchor = (node: AnyNode, written: string) => string;

const childrenOf = listPageDocumentChildren;
const attr = readPageDocumentText;

const leaveUnanchored: BlockAnchor = (_node, written) => written;

const anchorBlock: BlockAnchor = (node, written) => {
  const blockId = readPageDocumentBlockId(node);
  if (blockId === null || written === '') return written;
  return `${MARKDOWN_BLOCK_ANCHOR_OPEN}${blockId}${MARKDOWN_BLOCK_ANCHOR_CLOSE}\n${written}`;
};

/**
 * A word with whatever it wears written around it.
 *
 * A link is the outermost wrapper because that is how Markdown reads it: the
 * emphasis belongs to the words, and the link belongs to all of them together.
 */
const writeText = (node: AnyNode): string => {
  const marks = node.marks ?? [];
  const written = marks
    .filter((mark) => mark.type in MARKDOWN_MARK_WRAPPERS)
    .reduce((carried, mark) => {
      const wrapper = MARKDOWN_MARK_WRAPPERS[mark.type as keyof typeof MARKDOWN_MARK_WRAPPERS];
      return `${wrapper}${carried}${wrapper}`;
    }, node.text ?? '');
  const link = marks.find((mark) => mark.type === 'link');
  return link === undefined ? written : `[${written}](${link.attrs.href})`;
};

/**
 * What lives inside a line and is not a word.
 *
 * Each one is written as the thing Markdown already has that means the same:
 * a mention is a link to the page it names, a person is a link to who they
 * are, a formula is a formula. Nothing here invents syntax, so a plain reader
 * still reads a sentence.
 */
const writeInline = (node: AnyNode): string => {
  if (node.type === 'text') return writeText(node);
  if (node.type === 'hard_break') return '\n';
  if (node.type === 'mention')
    return `[${attr(node, 'label') ?? ''}](/spaces/${attr(node, 'spaceId') ?? ''}/pages/${attr(node, 'pageId') ?? ''})`;
  if (node.type === 'person') return `[@${attr(node, 'label') ?? ''}](person:${attr(node, 'userId') ?? ''})`;
  if (node.type === 'date') {
    const at = attr(node, 'at') ?? '';
    return `[${at}](date:${at})`;
  }
  if (node.type === 'formula') return `$${attr(node, 'latex') ?? ''}$`;
  return writeInlines(childrenOf(node));
};

const writeInlines = (nodes: readonly AnyNode[]): string => nodes.map(writeInline).join('');

/** What a block says on its own, with every line of it pushed behind the same marker. */
const indentEveryLine = (written: string, marker: string): string =>
  written
    .split('\n')
    .map((line) => `${marker}${line}`)
    .join('\n');

/**
 * Lo que dice un ítem de una lista.
 *
 * Su primera línea es el ítem mismo: se nombra por el ítem y no por esa línea,
 * así quien lo lee no ve dos ids para lo mismo. Lo que cuelga debajo sí lleva
 * el suyo.
 */
const writeListItemBody = (item: AnyNode, anchor: BlockAnchor): string => {
  const children = childrenOf(item);
  const line = children.at(0);
  return [line === undefined ? '' : writeBlock(line, anchor), writeBlocks(children.slice(1), anchor)]
    .filter((written) => written !== '')
    .join(MARKDOWN_BLOCK_SEPARATOR);
};

const writeListItems = (node: AnyNode, marker: (at: number) => string, anchor: BlockAnchor): string =>
  childrenOf(node)
    .map((item, at) => {
      const [head = '', ...rest] = writeListItemBody(item, anchor).split('\n');
      const lead = marker(at);
      const tail = rest.map((line) => `${' '.repeat(lead.length)}${line}`);
      return anchor(item, [`${lead}${head}`, ...tail].join('\n'));
    })
    .join('\n');

const writeTaskItems = (node: AnyNode, anchor: BlockAnchor): string =>
  childrenOf(node)
    .map((item) => anchor(item, `- [${item.attrs?.checked === true ? 'x' : ' '}] ${writeListItemBody(item, anchor)}`))
    .join('\n');

/** Una fila de una tabla. Las celdas van sin ids, porque una línea de tabla no admite nada entre sus celdas. */
const writeTableRow = (row: AnyNode): string =>
  `| ${childrenOf(row)
    .map((cell) => writeBlocks(childrenOf(cell), leaveUnanchored))
    .join(' | ')} |`;

const writeTable = (node: AnyNode): string => {
  const rows = childrenOf(node);
  const header = rows.at(0);
  if (header === undefined) return '';
  const body = rows.slice(1);
  const columns = childrenOf(header).length;
  const rule = `| ${Array.from({ length: columns }, () => '---').join(' | ')} |`;
  return [writeTableRow(header), rule, ...body.map(writeTableRow)].join('\n');
};

/** The data a block carries, written where a reader can see it and a reader-back can find it. */
const writeDirectiveAttrs = (node: AnyNode, names: readonly string[]): string => {
  const written = names
    .map((name) => [name, attr(node, name)] as const)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([name, value]) => `${name}="${value ?? ''}"`);
  return written.length === 0 ? '' : `{${written.join(' ')}}`;
};

const writeDirective = (node: AnyNode, names: readonly string[], inside: string): string =>
  [`${MARKDOWN_DIRECTIVE_FENCE}${node.type}${writeDirectiveAttrs(node, names)}`, inside, MARKDOWN_DIRECTIVE_FENCE]
    .filter((part) => part !== '')
    .join('\n');

/**
 * The attributes each kind of block is written with.
 *
 * Only what a reader-back would need to rebuild the block: an id that says
 * which page a collection draws from is worth keeping, and the width a column
 * happened to have is not.
 */
const DIRECTIVE_ATTRS: Readonly<Record<string, readonly string[]>> = {
  bookmark: ['url'],
  button: ['label'],
  callout: ['icon'],
  collection: ['pageId', 'view'],
  embed: ['url'],
  file: ['assetId', 'name'],
  subpage: ['pageId'],
  synced: ['pageId', 'blockId'],
  toggle: ['summary'],
};

const writeBlock = (node: AnyNode, anchor: BlockAnchor): string => {
  switch (node.type) {
    case 'paragraph':
      return writeInlines(childrenOf(node));
    case 'heading':
      return `${'#'.repeat(Number(node.attrs?.level ?? 1))} ${writeInlines(childrenOf(node))}`;
    case 'blockquote':
      return indentEveryLine(writeBlocks(childrenOf(node), anchor), '> ');
    case 'bullet_list':
      return writeListItems(node, () => '- ', anchor);
    case 'ordered_list':
      return writeListItems(node, (at) => `${String(at + 1)}. `, anchor);
    case 'task_list':
      return writeTaskItems(node, anchor);
    case 'code_block': {
      const language = attr(node, 'language') ?? '';
      return `\`\`\`${language}\n${writeInlines(childrenOf(node))}\n\`\`\``;
    }
    case 'divider':
      return '---';
    case 'table':
      return writeTable(node);
    case 'image':
    case 'video':
    case 'audio':
      return `![${attr(node, 'alt') ?? attr(node, 'name') ?? ''}](${attr(node, 'src') ?? attr(node, 'assetId') ?? ''})`;
    default:
      return writeDirective(
        node,
        DIRECTIVE_ATTRS[node.type] ?? Object.keys(node.attrs ?? {}),
        writeBlocks(childrenOf(node), anchor),
      );
  }
};

const writeBlocks = (nodes: readonly AnyNode[], anchor: BlockAnchor): string =>
  nodes
    .map((node) => anchor(node, writeBlock(node, anchor)))
    .filter((written) => written !== '')
    .join(MARKDOWN_BLOCK_SEPARATOR);

/**
 * A page written as Markdown.
 *
 * What Markdown already says is said in Markdown, so the file reads as an
 * ordinary document anywhere. What it does not say is written as the nearest
 * thing that carries the same meaning — a link, or a named fence — so what
 * comes out can be read back in without guessing.
 */
export const writePageAsMarkdown = (content: PageContent): string =>
  writeBlocks(content.content.filter(isPageDocumentNode), leaveUnanchored);

/**
 * La página en Markdown, con el id de cada bloque delante del bloque.
 *
 * Es la que lee un agente: para señalar un bloque, pedirlo o escribir junto a
 * él necesita su id, y lo encuentra justo donde está el bloque.
 */
export const writePageAsAnchoredMarkdown = (content: PageContent): string =>
  writeBlocks(content.content.filter(isPageDocumentNode), anchorBlock);

/** Unos bloques sueltos en Markdown, con sus ids, como salen dentro de una página. */
export const writeBlocksAsAnchoredMarkdown = (nodes: readonly unknown[]): string =>
  writeBlocks(nodes.filter(isPageDocumentNode), anchorBlock);
