import { isPageDocumentNode } from '../page-document/page-document.node.lib.js';
import type { PageDocumentNodeShape } from '../page-document/page-document.types.js';
import type { PageContentInlineNode, PageContentText, PageMark } from '../schemas/page-content.schema.js';
import { Result } from '../result.js';
import type { BlockPlainText, BlockRichText, BlockTextEmbed, BlockTextMarks } from './block-content.types.js';
import { BLOCK_DOCUMENT_ERROR_CODE } from './block-document.constants.js';
import { type BlockDocumentError, failBlockDocument } from './block-document.error.js';
import { blockPlainTextSchema, blockRichTextSchema } from './block-text.schemas.js';

type TextAttributes = Record<string, unknown>;

/** The order a page document writes the marks of one text; a test keeps it equal to the document structure. */
export const CANONICAL_MARK_ORDER: readonly string[] = [
  'code',
  'comment',
  'em',
  'link',
  'background_color',
  'strike',
  'strong',
  'text_color',
  'underline',
];

const EMBED_NODE_TYPES: readonly string[] = ['date', 'formula', 'mention', 'person'];

const readMarkValue = (mark: PageMark): unknown => {
  switch (mark.type) {
    case 'link':
      return mark.attrs.href;
    case 'text_color':
    case 'background_color':
      return mark.attrs.color;
    case 'comment':
      return mark.attrs.id;
    default:
      return true;
  }
};

const convertMarksToAttributes = (marks: readonly PageMark[]): Result<TextAttributes, BlockDocumentError> => {
  const attributes: TextAttributes = {};
  for (const mark of marks) {
    if (mark.type in attributes) {
      return failBlockDocument(
        BLOCK_DOCUMENT_ERROR_CODE.unsupportedText,
        `A text carries the mark ${mark.type} twice, which rich text attributes cannot hold`,
      );
    }
    attributes[mark.type] = readMarkValue(mark);
  }
  return Result.ok(attributes);
};

const convertTextNode = (node: PageDocumentNodeShape): Result<TextAttributes, BlockDocumentError> => {
  if (node.text === undefined)
    return failBlockDocument(BLOCK_DOCUMENT_ERROR_CODE.invalidBlock, 'A text node has no text');
  const attributes = convertMarksToAttributes(node.marks ?? []);
  if (attributes.isFail()) return Result.fail(attributes.getError());
  const hasMarks = Object.keys(attributes.getValue()).length > 0;
  return Result.ok(hasMarks ? { attributes: attributes.getValue(), insert: node.text } : { insert: node.text });
};

const convertEmbedNode = (node: PageDocumentNodeShape): Result<TextAttributes, BlockDocumentError> => {
  if (node.type === 'hard_break') return Result.ok({ insert: { hard_break: true } });
  if (!EMBED_NODE_TYPES.includes(node.type)) {
    return failBlockDocument(BLOCK_DOCUMENT_ERROR_CODE.invalidBlock, `The node ${node.type} is not inline text`);
  }
  return Result.ok({ insert: { [node.type]: node.attrs ?? {} } });
};

const convertInlineNode = (node: unknown): Result<TextAttributes, BlockDocumentError> => {
  if (!isPageDocumentNode(node)) {
    return failBlockDocument(BLOCK_DOCUMENT_ERROR_CODE.invalidBlock, 'An inline node has no type');
  }
  return node.type === 'text' ? convertTextNode(node) : convertEmbedNode(node);
};

const convertSegments = (nodes: readonly unknown[]): Result<readonly TextAttributes[], BlockDocumentError> => {
  const segments: TextAttributes[] = [];
  for (const node of nodes) {
    const segment = convertInlineNode(node);
    if (segment.isFail()) return Result.fail(segment.getError());
    segments.push(segment.getValue());
  }
  return Result.ok(segments);
};

/** Text nodes keep their order, one segment each; marks become attributes, inline nodes become embeds. */
export const inlineNodesToRichText = (nodes: readonly unknown[]): Result<BlockRichText, BlockDocumentError> => {
  const segments = convertSegments(nodes);
  if (segments.isFail()) return Result.fail(segments.getError());
  const parsed = blockRichTextSchema.safeParse(segments.getValue());
  if (parsed.success) return Result.ok(parsed.data);
  return failBlockDocument(
    BLOCK_DOCUMENT_ERROR_CODE.invalidBlock,
    `Inline content is not valid rich text: ${parsed.error.message}`,
  );
};

const isMarkDefined = (mark: PageMark | undefined): mark is PageMark => mark !== undefined;

const MARK_READERS: readonly ((attributes: BlockTextMarks) => PageMark | undefined)[] = [
  (attributes) => (attributes.code === true ? { type: 'code' } : undefined),
  (attributes) =>
    attributes.comment === undefined ? undefined : { attrs: { id: attributes.comment }, type: 'comment' },
  (attributes) => (attributes.em === true ? { type: 'em' } : undefined),
  (attributes) => (attributes.link === undefined ? undefined : { attrs: { href: attributes.link }, type: 'link' }),
  (attributes) =>
    attributes.background_color === undefined
      ? undefined
      : { attrs: { color: attributes.background_color }, type: 'background_color' },
  (attributes) => (attributes.strike === true ? { type: 'strike' } : undefined),
  (attributes) => (attributes.strong === true ? { type: 'strong' } : undefined),
  (attributes) =>
    attributes.text_color === undefined ? undefined : { attrs: { color: attributes.text_color }, type: 'text_color' },
  (attributes) => (attributes.underline === true ? { type: 'underline' } : undefined),
];

const convertAttributesToMarks = (attributes: BlockTextMarks): readonly PageMark[] =>
  MARK_READERS.map((read) => read(attributes)).filter(isMarkDefined);

const convertTextToInlineNode = (text: string, attributes: BlockTextMarks | undefined): PageContentInlineNode => {
  const marks = attributes === undefined ? [] : convertAttributesToMarks(attributes);
  return marks.length === 0 ? { text, type: 'text' } : { marks, text, type: 'text' };
};

const convertEmbedToInlineNode = (embed: BlockTextEmbed): PageContentInlineNode => {
  if ('mention' in embed) return { attrs: embed.mention, type: 'mention' };
  if ('person' in embed) return { attrs: embed.person, type: 'person' };
  if ('date' in embed) return { attrs: embed.date, type: 'date' };
  if ('formula' in embed) return { attrs: embed.formula, type: 'formula' };
  return { type: 'hard_break' };
};

const convertSegmentToInlineNode = (segment: BlockRichText[number]): PageContentInlineNode => {
  if (typeof segment.insert !== 'string') return convertEmbedToInlineNode(segment.insert);
  return convertTextToInlineNode(segment.insert, 'attributes' in segment ? segment.attributes : undefined);
};

/** Marks are written in the order the page document keeps them, whatever the order of the attributes. */
export const richTextToInlineNodes = (segments: BlockRichText): readonly PageContentInlineNode[] =>
  segments.map(convertSegmentToInlineNode);

const isUnmarkedText = (node: unknown): node is PageDocumentNodeShape =>
  isPageDocumentNode(node) && node.type === 'text' && node.text !== undefined && (node.marks ?? []).length === 0;

/** Code carries no marks and no embeds. */
export const textNodesToPlainText = (nodes: readonly unknown[]): Result<BlockPlainText, BlockDocumentError> => {
  if (!nodes.every(isUnmarkedText)) {
    return failBlockDocument(BLOCK_DOCUMENT_ERROR_CODE.invalidBlock, 'Code can only hold text without marks');
  }
  const parsed = blockPlainTextSchema.safeParse(nodes.map((node) => ({ insert: node.text })));
  if (parsed.success) return Result.ok(parsed.data);
  return failBlockDocument(BLOCK_DOCUMENT_ERROR_CODE.invalidBlock, `Code text is not valid: ${parsed.error.message}`);
};

export const plainTextToTextNodes = (segments: BlockPlainText): readonly PageContentText[] =>
  segments.map((segment) => ({ text: segment.insert, type: 'text' }));
