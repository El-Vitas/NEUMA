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

/** An unknown block has a free-form type, so these guards check the node's shape, not only its type name. */
const isPageContentText = (node: PageContentAnyNode): node is PageContentText =>
  node.type === 'text' && 'text' in node && typeof node.text === 'string';

const isPageContentMention = (node: PageContentAnyNode): node is PageContentMention =>
  node.type === 'mention' && 'attrs' in node && typeof node.attrs?.label === 'string';

const isPageContentPerson = (node: PageContentAnyNode): node is PageContentPerson =>
  node.type === 'person' && 'attrs' in node && typeof node.attrs?.label === 'string';

const isPageContentDate = (node: PageContentAnyNode): node is PageContentDate =>
  node.type === 'date' && 'attrs' in node && typeof node.attrs?.at === 'string';

/**
 * Leaf text segments in document order. Nodes without `content` (image, file,
 * embed) and unknown blocks contribute nothing. Mentions, people and dates
 * contribute their `label` or `at` so the page is findable by that name or day;
 * a formula's `latex` is skipped as noise.
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

/** Ids of mentioned pages, in document order, deduplicated. */
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
