import {
  isKnownPageContentNode,
  type PageContent,
  type PageContentDate,
  type PageContentInlineNode,
  type PageContentMention,
  type PageContentNode,
  type PageContentPerson,
  type PageContentText,
} from './schemas/page-content.schema.js';

type PageContentAnyNode = PageContentNode | PageContentInlineNode;

/**
 * What is written in a line, as opposed to a block. A block this version does
 * not know has a free-form type, so what is read out of a node is asked of its
 * shape rather than of its name alone.
 */
const isPageContentText = (node: PageContentAnyNode): node is PageContentText =>
  node.type === 'text' && 'text' in node && typeof node.text === 'string';

const isPageContentMention = (node: PageContentAnyNode): node is PageContentMention =>
  node.type === 'mention' && 'attrs' in node && typeof node.attrs?.label === 'string';

const isPageContentPerson = (node: PageContentAnyNode): node is PageContentPerson =>
  node.type === 'person' && 'attrs' in node && typeof node.attrs?.label === 'string';

const isPageContentDate = (node: PageContentAnyNode): node is PageContentDate =>
  node.type === 'date' && 'attrs' in node && typeof node.attrs?.at === 'string';

/**
 * Walks a page's ProseMirror-shaped content and returns every leaf text
 * segment in document order. Structural nodes without a `content` field
 * (image, file, embed) contribute nothing, and neither does a block this
 * version does not know: what it holds is never read into. A mention
 * contributes its denormalized `label`, so a page mentioning another page is
 * findable by searching the mentioned page's title. A person contributes its
 * `label` and a date contributes its `at`, for the same reason: naming
 * someone or naming a day should make the page findable by that name or that
 * day. A formula contributes nothing — its `latex` is machine writing, and
 * indexing it would only add noise.
 */
export const extractPageContentSegments = (content: PageContent): readonly string[] =>
  extractPageContentNodeSegments(content.content).filter((segment) => segment.length > 0);

const extractPageContentNodeSegments = (nodes: readonly PageContentAnyNode[]): readonly string[] =>
  nodes.flatMap(extractPageContentSingleNodeSegments);

const extractPageContentSingleNodeSegments = (node: PageContentAnyNode): readonly string[] => {
  if (isPageContentText(node)) return [node.text];
  if (isPageContentMention(node)) return [node.attrs.label];
  if (isPageContentPerson(node)) return [node.attrs.label];
  if (isPageContentDate(node)) return [node.attrs.at];
  if (!isKnownPageContentNode(node) || !('content' in node)) return [];
  return extractPageContentNodeSegments(node.content);
};

export const joinPageContentSegmentsForDisplay = (segments: readonly string[]): string => segments.join('\n\n');

export const joinPageContentSegmentsForSearch = (segments: readonly string[]): string => segments.join(' ');

/**
 * Walks a page's ProseMirror-shaped content and returns the ids of every
 * page referenced by a mention, in document order and deduplicated.
 */
export const extractPageMentionIds = (content: PageContent): readonly string[] => {
  const mentionedPageIds = extractPageContentNodeMentionIds(content.content);
  return [...new Set(mentionedPageIds)];
};

const extractPageContentNodeMentionIds = (nodes: readonly PageContentAnyNode[]): readonly string[] =>
  nodes.flatMap(extractPageContentSingleNodeMentionIds);

const extractPageContentSingleNodeMentionIds = (node: PageContentAnyNode): readonly string[] => {
  if (isPageContentMention(node)) return [node.attrs.pageId];
  if (!isKnownPageContentNode(node) || !('content' in node)) return [];
  return extractPageContentNodeMentionIds(node.content);
};

export type PageCollectionReference = {
  readonly pageId: string;
  readonly spaceId: string;
  readonly viewName?: string;
};

export const extractPageCollectionReferences = (content: PageContent): readonly PageCollectionReference[] =>
  extractPageContentNodeCollections(content.content);

const extractPageContentNodeCollections = (nodes: readonly PageContentAnyNode[]): readonly PageCollectionReference[] =>
  nodes.flatMap(extractPageContentSingleNodeCollections);

const extractPageContentSingleNodeCollections = (node: PageContentAnyNode): readonly PageCollectionReference[] => {
  if (!isKnownPageContentNode(node)) return [];
  if (node.type === 'collection') return [node.attrs];
  if (!('content' in node)) return [];
  return extractPageContentNodeCollections(node.content);
};
