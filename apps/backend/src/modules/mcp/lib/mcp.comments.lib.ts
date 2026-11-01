import {
  describeMissingPageBlock,
  findPageBlock,
  isPageDocumentNode,
  listPageDocumentChildren,
  type PageContent,
  type PageDocumentNodeShape,
  type PageMark,
  pageContentSchema,
  Result,
  replacePageBlock,
} from '@neuma/shared';
import { MCP_INLINE_OBJECT_PLACEHOLDER, MCP_UNREADABLE_PAGE_MESSAGE } from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import type { McpContentEdit, McpTextNode } from '../types/mcp.pages.types';

const isText = (node: unknown): node is McpTextNode =>
  isPageDocumentNode(node) && node.type === 'text' && typeof node.text === 'string';

const commentMark = (discussionId: string): PageMark => ({ attrs: { id: discussionId }, type: 'comment' });

const cutText = (node: McpTextNode, text: string, extra: readonly PageMark[]): McpTextNode[] => {
  if (text === '') return [];
  const marks = [...(node.marks ?? []), ...extra];
  return [marks.length === 0 ? { text, type: 'text' } : { marks, text, type: 'text' }];
};

const splitText = (node: McpTextNode, from: number, to: number, discussionId: string): McpTextNode[] => {
  const start = Math.max(0, from);
  const end = Math.min(node.text.length, to);
  return [
    ...cutText(node, node.text.slice(0, start), []),
    ...cutText(node, node.text.slice(start, end), [commentMark(discussionId)]),
    ...cutText(node, node.text.slice(end), []),
  ];
};

/** Non-text content (mentions, formulas) is a placeholder no quote matches, so a quote never spans it. */
const markInline = (nodes: readonly unknown[], quote: string, discussionId: string): unknown[] | null => {
  const joined = nodes.map((node) => (isText(node) ? node.text : MCP_INLINE_OBJECT_PLACEHOLDER)).join('');
  const from = joined.indexOf(quote);
  if (from === -1) return null;
  const to = from + quote.length;
  let offset = 0;
  return nodes.flatMap((node) => {
    const start = offset;
    offset += isText(node) ? node.text.length : MCP_INLINE_OBJECT_PLACEHOLDER.length;
    const isOutside = !isText(node) || offset <= from || start >= to;
    return isOutside ? [node] : splitText(node, from - start, to - start, discussionId);
  });
};

const markQuote = (node: PageDocumentNodeShape, quote: string, discussionId: string): PageDocumentNodeShape | null => {
  const children = listPageDocumentChildren(node);
  if (children.some(isText)) {
    const marked = markInline(children, quote, discussionId);
    return marked === null ? null : { ...node, content: marked };
  }
  for (const [index, child] of children.entries()) {
    const marked = markQuote(child, quote, discussionId);
    if (marked !== null) return { ...node, content: children.with(index, marked) };
  }
  return null;
};

/** The page as the tools read it; one whose stored content no longer fits the schema cannot be worked on. */
export const readMcpStoredContent = (stored: unknown): PageContent => {
  const content = pageContentSchema.safeParse(stored);
  if (!content.success) throw new McpToolError(MCP_UNREADABLE_PAGE_MESSAGE);
  return content.data;
};

const describeMissingQuote = (quote: string): string =>
  `The block does not say "${quote}". Quote words exactly as fetch shows them, or leave quote out.`;

/** Whether the words are in the block, checked before anything is created so a wrong quote leaves nothing behind. */
export const checkMcpQuote = (
  content: { readonly content: readonly unknown[] },
  blockId: string,
  quote: string,
): Result<true, string> => {
  const node = findPageBlock(content.content, blockId);
  if (node === null) return Result.fail(describeMissingPageBlock(blockId));
  return markQuote(node, quote, '') === null ? Result.fail(describeMissingQuote(quote)) : Result.ok(true);
};

/** Marks the quoted words with the id of their discussion, as selecting text and commenting does in the editor. */
export const markMcpQuote =
  (blockId: string, quote: string, discussionId: string): McpContentEdit =>
  (content) => {
    const node = findPageBlock(content.content, blockId);
    if (node === null) return Result.fail(describeMissingPageBlock(blockId));
    const marked = markQuote(node, quote, discussionId);
    return marked === null ? Result.fail(describeMissingQuote(quote)) : replacePageBlock(content, blockId, marked);
  };

const withoutCommentMark = (node: unknown, discussionId: string): unknown => {
  if (!isPageDocumentNode(node)) return node;
  const marks = node.marks?.filter((mark) => mark.type !== 'comment' || mark.attrs.id !== discussionId);
  const children = node.content?.map((child) => withoutCommentMark(child, discussionId));
  return {
    ...node,
    ...(marks === undefined ? {} : { marks }),
    ...(children === undefined ? {} : { content: children }),
  };
};

/** Takes the mark off the words of a discussion that no longer exists, so nothing stays underlined. */
export const unmarkMcpDiscussion =
  (blockId: string, discussionId: string): McpContentEdit =>
  (content) => {
    const node = findPageBlock(content.content, blockId);
    if (node === null) return Result.fail(describeMissingPageBlock(blockId));
    const unmarked = withoutCommentMark(node, discussionId);
    return replacePageBlock(content, blockId, isPageDocumentNode(unmarked) ? unmarked : node);
  };
