import {
  isAllowedPageEmbedUrl,
  PAGE_DIAGRAM_LANGUAGE,
  PAGE_EMBED_PROVIDERS,
  PAGE_FORMULA_LANGUAGE,
  Result,
  readMarkdownInline,
} from '@company-brain/shared';
import {
  MCP_BOOKMARK_PROTOCOLS,
  MCP_PARAGRAPH_SEPARATOR,
  MCP_UNREADABLE_ADDRESS_MESSAGE,
} from '../constants/mcp.constants';
import type {
  McpBlockInput,
  McpBookmarkBlockInput,
  McpBuiltNode,
  McpButtonBlockInput,
  McpCollectionBlockInput,
  McpColumnsBlockInput,
  McpListBlockInput,
  McpSyncedBlockInput,
  McpTableBlockInput,
  McpTaskListBlockInput,
} from '../types/mcp.pages.types';
import { readMcpAddress } from './mcp.address.lib';
import { collectMcpResults as collect } from './mcp.results.lib';

const writeLine = (type: string, text: string, attrs?: McpBuiltNode): Result<McpBuiltNode, string> => {
  const inline = readMarkdownInline(text);
  if (inline.isFail()) return Result.fail(inline.getError());
  return Result.ok({ ...(attrs === undefined ? {} : { attrs }), content: inline.getValue(), type });
};

const writeParagraph = (text: string): Result<McpBuiltNode, string> => writeLine('paragraph', text);

/** Varios párrafos, uno por cada parte entre líneas en blanco; al menos uno, aunque esté vacío. */
const writeParagraphs = (text: string): Result<McpBuiltNode[], string> => {
  const parts = text.split(MCP_PARAGRAPH_SEPARATOR).filter((part) => part.trim() !== '');
  return collect((parts.length === 0 ? [''] : parts).map((part) => writeParagraph(part.trim())));
};

const writeHolder = (type: string, text: string, attrs?: McpBuiltNode): Result<McpBuiltNode, string> => {
  const paragraphs = writeParagraphs(text);
  if (paragraphs.isFail()) return Result.fail(paragraphs.getError());
  return Result.ok({ ...(attrs === undefined ? {} : { attrs }), content: paragraphs.getValue(), type });
};

/** Una lista numerada dice desde qué número cuenta, igual que en el editor; las demás no dicen nada. */
const listAttrs = (listType: string): McpBuiltNode => (listType === 'ordered_list' ? { attrs: { order: 1 } } : {});

const writeListItem = (item: McpListBlockInput['items'][number], listType: string): Result<McpBuiltNode, string> => {
  const text = typeof item === 'string' ? item : item.text;
  const nested = typeof item === 'string' ? [] : (item.items ?? []);
  const line = writeParagraph(text);
  if (line.isFail()) return line;
  if (nested.length === 0) return Result.ok({ content: [line.getValue()], type: 'list_item' });
  const inner = collect(nested.map((nestedItem) => writeListItem(nestedItem, listType)));
  if (inner.isFail()) return Result.fail(inner.getError());
  const nestedList = { ...listAttrs(listType), content: inner.getValue(), type: listType };
  return Result.ok({ content: [line.getValue(), nestedList], type: 'list_item' });
};

const writeList = (input: McpListBlockInput): Result<McpBuiltNode, string> => {
  const items = collect(input.items.map((item) => writeListItem(item, input.type)));
  if (items.isFail()) return Result.fail(items.getError());
  return Result.ok({ ...listAttrs(input.type), content: items.getValue(), type: input.type });
};

const writeTaskItem = (item: McpTaskListBlockInput['items'][number]): Result<McpBuiltNode, string> => {
  const line = writeParagraph(item.text);
  if (line.isFail()) return line;
  return Result.ok({ attrs: { checked: item.checked === true }, content: [line.getValue()], type: 'task_item' });
};

const writeTaskList = (input: McpTaskListBlockInput): Result<McpBuiltNode, string> => {
  const items = collect(input.items.map(writeTaskItem));
  return items.isFail() ? Result.fail(items.getError()) : Result.ok({ content: items.getValue(), type: 'task_list' });
};

const writeTableRow = (cells: readonly string[], width: number, cellType: string): Result<McpBuiltNode, string> => {
  const filled = [...cells, ...Array.from({ length: width - cells.length }, () => '')];
  const written = collect(filled.map((cell) => writeParagraph(cell)));
  if (written.isFail()) return Result.fail(written.getError());
  return Result.ok({
    content: written.getValue().map((paragraph) => ({ content: [paragraph], type: cellType })),
    type: 'table_row',
  });
};

/** Una tabla de verdad: la fila de encabezados, y cada fila completada hasta el ancho de los encabezados. */
const writeTable = (input: McpTableBlockInput): Result<McpBuiltNode, string> => {
  const width = input.header.length;
  const tooWide = input.rows.findIndex((row) => row.length > width);
  if (tooWide !== -1)
    return Result.fail(`The table has ${String(width)} columns, but row ${String(tooWide + 1)} has more cells.`);
  const rows = collect([
    writeTableRow(input.header, width, 'table_header'),
    ...input.rows.map((row) => writeTableRow(row, width, 'table_cell')),
  ]);
  return rows.isFail() ? Result.fail(rows.getError()) : Result.ok({ content: rows.getValue(), type: 'table' });
};

/** Un bloque de código que la página dibuja: un diagrama o una fórmula. Muestra el dibujo, salvo que se pida otra cosa. */
const writeDrawn = (language: string, source: string, view: string | undefined): McpBuiltNode => ({
  attrs: { language, ...(view === undefined ? {} : { shown: view }) },
  content: [{ text: source, type: 'text' }],
  type: 'code_block',
});

/** La página de un enlace o un id. El nombre y el espacio los pone Company Brain después, con los de hoy. */
const readReferencedPage = (address: string): Result<string, string> => {
  const read = readMcpAddress(address);
  if (read.kind === 'page') return Result.ok(read.pageId);
  if (read.kind === 'id') return Result.ok(read.id);
  return Result.fail(MCP_UNREADABLE_ADDRESS_MESSAGE);
};

const writeReference = (type: string, address: string, attrs: McpBuiltNode = {}): Result<McpBuiltNode, string> => {
  const pageId = readReferencedPage(address);
  if (pageId.isFail()) return Result.fail(pageId.getError());
  return Result.ok({ attrs: { label: '', pageId: pageId.getValue(), spaceId: '', ...attrs }, type });
};

const writeCollection = (input: McpCollectionBlockInput): Result<McpBuiltNode, string> => {
  const pageId = readReferencedPage(input.collection);
  if (pageId.isFail()) return Result.fail(pageId.getError());
  const viewName = input.view === undefined ? {} : { viewName: input.view };
  return Result.ok({ attrs: { pageId: pageId.getValue(), spaceId: '', ...viewName }, type: 'collection' });
};

/** Un botón: lo que escribe al apretarlo, o la fila que agrega a una colección, nombrada por ese texto. */
const writeButton = (input: McpButtonBlockInput): Result<McpBuiltNode, string> => {
  const content = writeParagraphs(input.text);
  if (content.isFail()) return Result.fail(content.getError());
  const collection = input.addsRowTo === undefined ? null : readReferencedPage(input.addsRowTo);
  if (collection?.isFail() === true) return Result.fail(collection.getError());
  const row = collection === null ? { deed: 'blocks' } : { deed: 'row', pageId: collection.getValue(), spaceId: '' };
  const place = input.place === undefined ? {} : { place: input.place };
  return Result.ok({ attrs: { label: input.label, ...row, ...place }, content: content.getValue(), type: 'button' });
};

/** Una tarjeta de enlace con las palabras que puso el agente: nadie visita el enlace para buscarlas. */
const writeBookmark = (input: McpBookmarkBlockInput): Result<McpBuiltNode, string> => {
  if (!URL.canParse(input.url) || !MCP_BOOKMARK_PROTOCOLS.includes(new URL(input.url).protocol))
    return Result.fail(`"${input.url}" is not a web address: a link card takes an http or https link.`);
  const words = {
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.title === undefined ? {} : { title: input.title }),
  };
  return Result.ok({ attrs: { ...words, url: input.url }, type: 'bookmark' });
};

/** Un video o un diseño que la página reproduce, del sitio al que pertenece su enlace. */
const writeEmbed = (url: string): Result<McpBuiltNode, string> => {
  const provider = PAGE_EMBED_PROVIDERS.find((known) => isAllowedPageEmbedUrl(known, url));
  return provider === undefined
    ? Result.fail(`"${url}" cannot be played in a page: use an https link from YouTube, Vimeo, Loom or Figma.`)
    : Result.ok({ attrs: { provider, url }, type: 'embed' });
};

/** Un bloque que muestra otro de otra página. El espacio lo pone Company Brain después, con el de hoy. */
const writeSynced = (input: McpSyncedBlockInput): Result<McpBuiltNode, string> => {
  const pageId = readReferencedPage(input.page);
  if (pageId.isFail()) return Result.fail(pageId.getError());
  return Result.ok({ attrs: { blockId: input.block, pageId: pageId.getValue(), spaceId: '' }, type: 'synced' });
};

/** Unas columnas lado a lado, cada una con sus bloques; el error dice en qué columna estaba el que falló. */
const writeColumns = (input: McpColumnsBlockInput): Result<McpBuiltNode, string> => {
  const columns = collect(
    input.columns.map((blocks, index) => {
      const built = collect(blocks.map(writeBlock));
      return built.isFail()
        ? Result.fail<McpBuiltNode, string>(`column ${String(index + 1)}: ${built.getError()}`)
        : Result.ok<McpBuiltNode, string>({ content: built.getValue(), type: 'column' });
    }),
  );
  return columns.isFail()
    ? Result.fail(columns.getError())
    : Result.ok({ content: columns.getValue(), type: 'column_list' });
};

const writeBlock = (input: McpBlockInput): Result<McpBuiltNode, string> => {
  switch (input.type) {
    case 'columns':
      return writeColumns(input);
    case 'bookmark':
      return writeBookmark(input);
    case 'embed':
      return writeEmbed(input.url);
    case 'synced':
      return writeSynced(input);
    case 'paragraph':
      return writeParagraph(input.text);
    case 'heading':
      return writeLine('heading', input.text, { level: input.level });
    case 'bullet_list':
    case 'ordered_list':
      return writeList(input);
    case 'task_list':
      return writeTaskList(input);
    case 'blockquote':
      return writeHolder('blockquote', input.text);
    case 'callout':
      return writeHolder('callout', input.text, input.icon === undefined ? undefined : { icon: input.icon });
    case 'code_block':
      return Result.ok({
        ...(input.language === undefined ? {} : { attrs: { language: input.language } }),
        content: [{ text: input.text, type: 'text' }],
        type: 'code_block',
      });
    case 'diagram':
      return Result.ok(writeDrawn(PAGE_DIAGRAM_LANGUAGE, input.source, input.view));
    case 'formula':
      return Result.ok(writeDrawn(PAGE_FORMULA_LANGUAGE, input.latex, input.view));
    case 'divider':
      return Result.ok({ type: 'divider' });
    case 'table_of_contents':
      return Result.ok({ type: 'table_of_contents' });
    case 'table':
      return writeTable(input);
    case 'subpage':
      return writeReference('subpage', input.page);
    case 'collection':
      return writeCollection(input);
    case 'button':
      return writeButton(input);
    case 'toggle':
      return writeHolder('toggle', input.text ?? '', { summary: input.summary });
    default:
      return input satisfies never;
  }
};

/**
 * Los nodos que guarda una página, a partir de los bloques que escribió el
 * agente. Si uno no se puede armar, no se arma ninguno, y el error dice cuál
 * era, contando desde uno.
 */
export const buildMcpBlockNodes = (blocks: readonly McpBlockInput[]): Result<McpBuiltNode[], string> =>
  collect(
    blocks.map((block, position) => {
      const built = writeBlock(block);
      return built.isFail() ? Result.fail(`Block ${String(position + 1)}: ${built.getError()}`) : built;
    }),
  );
