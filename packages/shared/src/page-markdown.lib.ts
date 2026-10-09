import {
  MARKDOWN_BLOCK_ANCHOR_CLOSE,
  MARKDOWN_BLOCK_ANCHOR_ID,
  MARKDOWN_BLOCK_ANCHOR_OPEN,
  MARKDOWN_BLOCK_COLOR_ATTRIBUTES,
  MARKDOWN_BLOCK_SEPARATOR,
  MARKDOWN_DIRECTIVE_ATTRIBUTES,
  MARKDOWN_DIRECTIVE_FENCE,
  MARKDOWN_MARK_WRAPPERS,
  MARKDOWN_TAG_MARKS,
} from './constants/page-markdown.constants.js';
import {
  isPageDocumentNode,
  listPageDocumentChildren,
  readPageDocumentBlockId,
  readPageDocumentText,
} from './page-document/page-document.node.lib.js';
import type { PageDocumentNodeShape } from './page-document/page-document.types.js';
import {
  buildMarkdownCodeFence,
  escapeMarkdownDirectiveValue,
  escapeMarkdownLineStarts,
  escapeMarkdownLinkTarget,
  escapeMarkdownTableCell,
  escapeMarkdownText,
} from './page-markdown.escape.lib.js';
import type { PageContent, PageMark } from './schemas/page-content.schema.js';

type AnyNode = PageDocumentNodeShape;

type BlockAnchor = (node: AnyNode, written: string) => string;

const childrenOf = listPageDocumentChildren;
const attr = readPageDocumentText;

const leaveUnanchored: BlockAnchor = (_node, written) => written;

const writeBlockColors = (node: AnyNode): string =>
  MARKDOWN_BLOCK_COLOR_ATTRIBUTES.map((name) => [name, attr(node, name)] as const)
    .filter(([, color]) => color !== undefined)
    .map(([name, color]) => ` ${name}="${color ?? ''}"`)
    .join('');

const anchorBlock: BlockAnchor = (node, written) => {
  const blockId = readPageDocumentBlockId(node);
  if (blockId === null || written === '' || !MARKDOWN_BLOCK_ANCHOR_ID.test(blockId)) return written;
  return `${MARKDOWN_BLOCK_ANCHOR_OPEN}${blockId}${writeBlockColors(node)}${MARKDOWN_BLOCK_ANCHOR_CLOSE}\n${written}`;
};

const writeTagMark = (carried: string, mark: PageMark): string => {
  switch (mark.type) {
    case 'underline':
      return `<${MARKDOWN_TAG_MARKS.underline}>${carried}</${MARKDOWN_TAG_MARKS.underline}>`;
    case 'text_color':
      return `<${MARKDOWN_TAG_MARKS.text_color} color="${mark.attrs.color}">${carried}</${MARKDOWN_TAG_MARKS.text_color}>`;
    case 'background_color':
      return `<${MARKDOWN_TAG_MARKS.background_color} color="${mark.attrs.color}">${carried}</${MARKDOWN_TAG_MARKS.background_color}>`;
    default:
      return carried;
  }
};

// The link is the outermost wrapper: emphasis belongs to the words, the link to all of them.
const writeText = (node: AnyNode): string => {
  const marks = node.marks ?? [];
  const isCode = marks.some((mark) => mark.type === 'code');
  const words = isCode ? (node.text ?? '') : escapeMarkdownText(node.text ?? '');
  const wrapped = marks
    .filter((mark) => mark.type in MARKDOWN_MARK_WRAPPERS)
    .reduce((carried, mark) => {
      const wrapper = MARKDOWN_MARK_WRAPPERS[mark.type as keyof typeof MARKDOWN_MARK_WRAPPERS];
      return `${wrapper}${carried}${wrapper}`;
    }, words);
  const written = marks.reduce((carried, mark) => writeTagMark(carried, mark), wrapped);
  const link = marks.find((mark) => mark.type === 'link');
  return link === undefined ? written : `[${written}](${escapeMarkdownLinkTarget(link.attrs.href)})`;
};

const readMentionTarget = (node: AnyNode): string =>
  ['', 'spaces', attr(node, 'spaceId') ?? '', 'pages', attr(node, 'pageId') ?? ''].join('/');

/** Mentions, people and formulas use constructs Markdown already has, so a plain reader still reads a sentence. */
const writeInline = (node: AnyNode): string => {
  if (node.type === 'text') return writeText(node);
  if (node.type === 'hard_break') return '\n';
  if (node.type === 'mention')
    return `[${escapeMarkdownText(attr(node, 'label') ?? '')}](${escapeMarkdownLinkTarget(readMentionTarget(node))})`;
  if (node.type === 'person')
    return `[@${escapeMarkdownText(attr(node, 'label') ?? '')}](person:${escapeMarkdownLinkTarget(attr(node, 'userId') ?? '')})`;
  if (node.type === 'date') {
    const at = attr(node, 'at') ?? '';
    return `[${at}](date:${at})`;
  }
  if (node.type === 'formula') return `$${attr(node, 'latex') ?? ''}$`;
  return writeInlines(childrenOf(node));
};

const writeInlines = (nodes: readonly AnyNode[]): string => nodes.map(writeInline).join('');

const indentEveryLine = (written: string, marker: string): string =>
  written
    .split('\n')
    .map((line) => `${marker}${line}`)
    .join('\n');

/** The first line is the item itself and carries no id of its own; nested blocks do. */
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

/** Cells carry no ids: a table row allows nothing between its cells. */
const writeTableRow = (row: AnyNode): string =>
  `| ${childrenOf(row)
    .map((cell) => escapeMarkdownTableCell(writeBlocks(childrenOf(cell), leaveUnanchored)))
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

const writeCodeBlock = (node: AnyNode): string => {
  const code = childrenOf(node)
    .map((child) => child.text ?? '')
    .join('');
  const fence = buildMarkdownCodeFence(code);
  return `${fence}${attr(node, 'language') ?? ''}\n${code}\n${fence}`;
};

const readWritableAttr = (node: AnyNode, name: string): string | undefined => {
  const value = node.attrs?.[name];
  return typeof value === 'number' ? String(value) : attr(node, name);
};

const writeDirectiveAttrs = (node: AnyNode, names: readonly string[]): string => {
  const written = names
    .map((name) => [name, readWritableAttr(node, name)] as const)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([name, value]) => `${name}="${escapeMarkdownDirectiveValue(value ?? '')}"`);
  return written.length === 0 ? '' : `{${written.join(' ')}}`;
};

const writeDirective = (node: AnyNode, names: readonly string[], inside: string): string =>
  [`${MARKDOWN_DIRECTIVE_FENCE}${node.type}${writeDirectiveAttrs(node, names)}`, inside, MARKDOWN_DIRECTIVE_FENCE]
    .filter((part) => part !== '')
    .join('\n');

const writeBlock = (node: AnyNode, anchor: BlockAnchor): string => {
  switch (node.type) {
    case 'paragraph':
      return escapeMarkdownLineStarts(writeInlines(childrenOf(node)));
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
    case 'code_block':
      return writeCodeBlock(node);
    case 'divider':
      return '---';
    case 'table':
      return writeTable(node);
    case 'image':
    case 'video':
    case 'audio':
      return `![${escapeMarkdownText(attr(node, 'alt') ?? attr(node, 'name') ?? '')}](${escapeMarkdownLinkTarget(attr(node, 'src') ?? attr(node, 'assetId') ?? '')})`;
    default:
      return writeDirective(
        node,
        MARKDOWN_DIRECTIVE_ATTRIBUTES[node.type] ?? Object.keys(node.attrs ?? {}),
        writeBlocks(childrenOf(node), anchor),
      );
  }
};

const writeBlocks = (nodes: readonly AnyNode[], anchor: BlockAnchor): string =>
  nodes
    .map((node) => anchor(node, writeBlock(node, anchor)))
    .filter((written) => written !== '')
    .join(MARKDOWN_BLOCK_SEPARATOR);

/** What Markdown cannot say is written as the nearest equivalent (a link, a named fence) so it reads back. */
export const writePageAsMarkdown = (content: PageContent): string =>
  writeBlocks(content.content.filter(isPageDocumentNode), leaveUnanchored);

/** Read by agents, who need each block's id to reference, request or write next to it. */
export const writePageAsAnchoredMarkdown = (content: PageContent): string =>
  writeBlocks(content.content.filter(isPageDocumentNode), anchorBlock);

export const writeBlocksAsAnchoredMarkdown = (nodes: readonly unknown[]): string =>
  writeBlocks(nodes.filter(isPageDocumentNode), anchorBlock);
