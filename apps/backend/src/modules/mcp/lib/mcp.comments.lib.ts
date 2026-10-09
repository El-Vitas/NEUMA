import {
  describeMissingPageBlock,
  findPageBlock,
  isPageDocumentNode,
  listPageDocumentChildren,
  PAGE_BLOCK_COMMENTS_MOST,
  type PageBlockComment,
  type PageDocumentNodeShape,
  type PageMark,
  Result,
  replacePageBlock,
} from '@company-brain/shared';
import { MCP_INLINE_OBJECT_PLACEHOLDER } from '../constants/mcp.constants';
import type { McpContentEdit, McpTextNode } from '../types/mcp.pages.types';

const isText = (node: unknown): node is McpTextNode =>
  isPageDocumentNode(node) && node.type === 'text' && typeof node.text === 'string';

/** Los comentarios de un bloque tal como están guardados, sin dejar ninguno afuera: se reescriben con el bloque. */
const readStoredComments = (node: PageDocumentNodeShape): readonly unknown[] => {
  const comments = node.attrs?.comments;
  return Array.isArray(comments) ? comments : [];
};

const commentMark = (commentId: string): PageMark => ({ attrs: { id: commentId }, type: 'comment' });

/** Un trozo de texto con el mismo aspecto y lo que ya llevaba, más la marca del comentario si le toca. */
const cutText = (node: McpTextNode, text: string, extra: readonly PageMark[]): McpTextNode[] => {
  if (text === '') return [];
  const marks = [...(node.marks ?? []), ...extra];
  return [marks.length === 0 ? { text, type: 'text' } : { marks, text, type: 'text' }];
};

/** Parte un texto en lo que queda antes, lo que dice el comentario y lo que queda después. */
const splitText = (node: McpTextNode, from: number, to: number, commentId: string): McpTextNode[] => {
  const start = Math.max(0, from);
  const end = Math.min(node.text.length, to);
  return [
    ...cutText(node, node.text.slice(0, start), []),
    ...cutText(node, node.text.slice(start, end), [commentMark(commentId)]),
    ...cutText(node, node.text.slice(end), []),
  ];
};

/**
 * Marca, en una línea, las palabras de las que habla un comentario. Lo que no
 * es texto —una mención, una fórmula— ocupa un lugar que ninguna cita calza,
 * así que una cita nunca lo cruza.
 */
const markInline = (nodes: readonly unknown[], quote: string, commentId: string): unknown[] | null => {
  const joined = nodes.map((node) => (isText(node) ? node.text : MCP_INLINE_OBJECT_PLACEHOLDER)).join('');
  const from = joined.indexOf(quote);
  if (from === -1) return null;
  const to = from + quote.length;
  let offset = 0;
  return nodes.flatMap((node) => {
    const start = offset;
    offset += isText(node) ? node.text.length : MCP_INLINE_OBJECT_PLACEHOLDER.length;
    const isOutside = !isText(node) || offset <= from || start >= to;
    return isOutside ? [node] : splitText(node, from - start, to - start, commentId);
  });
};

/** El bloque con esas palabras marcadas donde las diga primero: en su propia línea o en lo que lleva dentro. */
const markQuote = (node: PageDocumentNodeShape, quote: string, commentId: string): PageDocumentNodeShape | null => {
  const children = listPageDocumentChildren(node);
  if (children.some(isText)) {
    const marked = markInline(children, quote, commentId);
    return marked === null ? null : { ...node, content: marked };
  }
  for (const [index, child] of children.entries()) {
    const marked = markQuote(child, quote, commentId);
    if (marked !== null) return { ...node, content: children.with(index, marked) };
  }
  return null;
};

const findQuote = (
  node: PageDocumentNodeShape,
  quote: string | undefined,
  commentId: string,
): Result<PageDocumentNodeShape, string> => {
  if (quote === undefined) return Result.ok(node);
  const marked = markQuote(node, quote, commentId);
  return marked === null
    ? Result.fail(`The block does not say "${quote}". Quote words exactly as fetch shows them, or leave quote out.`)
    : Result.ok(marked);
};

/**
 * Deja un comentario en un bloque, como lo deja una persona desde el menú del
 * bloque: queda en el bloque mismo, así viaja con él cuando se mueve. Si habla
 * de unas palabras, esas palabras quedan marcadas con él.
 */
export const addMcpBlockComment =
  (blockId: string, comment: PageBlockComment, quote?: string): McpContentEdit =>
  (content) => {
    const node = findPageBlock(content.content, blockId);
    if (node === null) return Result.fail(describeMissingPageBlock(blockId));
    const comments = readStoredComments(node);
    if (comments.length >= PAGE_BLOCK_COMMENTS_MOST)
      return Result.fail(
        `Block ${blockId} already has ${String(PAGE_BLOCK_COMMENTS_MOST)} comments, the most a block holds. Delete one first.`,
      );
    const marked = findQuote(node, quote, comment.id);
    if (marked.isFail()) return Result.fail(marked.getError());
    const commented = { ...marked.getValue(), attrs: { ...node.attrs, comments: [...comments, comment] } };
    return replacePageBlock(content, blockId, commented);
  };

const withoutCommentMark = (node: unknown, commentId: string): unknown => {
  if (!isPageDocumentNode(node)) return node;
  const marks = node.marks?.filter((mark) => mark.type !== 'comment' || mark.attrs.id !== commentId);
  const children = node.content?.map((child) => withoutCommentMark(child, commentId));
  return {
    ...node,
    ...(marks === undefined ? {} : { marks }),
    ...(children === undefined ? {} : { content: children }),
  };
};

const isCommentWithId = (comment: unknown, commentId: string): boolean =>
  typeof comment === 'object' && comment !== null && 'id' in comment && comment.id === commentId;

/** Quita un comentario de su bloque y de las palabras que marcaba, como lo quita una persona. */
export const removeMcpBlockComment =
  (blockId: string, commentId: string): McpContentEdit =>
  (content) => {
    const node = findPageBlock(content.content, blockId);
    if (node === null) return Result.fail(describeMissingPageBlock(blockId));
    const comments = readStoredComments(node);
    const remaining = comments.filter((comment) => !isCommentWithId(comment, commentId));
    if (remaining.length === comments.length)
      return Result.fail(
        `Block ${blockId} has no comment ${commentId}. Read the page again with fetch to see its comments.`,
      );
    const { comments: _gone, ...attrs } = node.attrs ?? {};
    const unmarked = withoutCommentMark(node, commentId);
    const cleared = {
      ...(isPageDocumentNode(unmarked) ? unmarked : node),
      attrs: remaining.length === 0 ? attrs : { ...attrs, comments: remaining },
    };
    return replacePageBlock(content, blockId, cleared);
  };
