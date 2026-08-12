import type { PageContent, PageContentInlineNode, PageContentNode } from './schemas/page-content.schema.js';

/**
 * Walks a page's ProseMirror-shaped content and returns every leaf text
 * segment in document order. Structural nodes without a `content` field
 * (image, file, embed) contribute nothing. A mention contributes its
 * denormalized `label`, so a page mentioning another page is findable by
 * searching the mentioned page's title.
 */
export const extractPageContentSegments = (content: PageContent): readonly string[] =>
  extractPageContentNodeSegments(content.content).filter((segment) => segment.length > 0);

const extractPageContentNodeSegments = (
  nodes: readonly (PageContentNode | PageContentInlineNode)[],
): readonly string[] => nodes.flatMap(extractPageContentSingleNodeSegments);

const extractPageContentSingleNodeSegments = (node: PageContentNode | PageContentInlineNode): readonly string[] => {
  if (node.type === 'text') return [node.text];
  if (node.type === 'mention') return [node.attrs.label];
  if (!('content' in node)) return [];
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

const extractPageContentNodeMentionIds = (
  nodes: readonly (PageContentNode | PageContentInlineNode)[],
): readonly string[] => nodes.flatMap(extractPageContentSingleNodeMentionIds);

const extractPageContentSingleNodeMentionIds = (node: PageContentNode | PageContentInlineNode): readonly string[] => {
  if (node.type === 'mention') return [node.attrs.pageId];
  if (!('content' in node)) return [];
  return extractPageContentNodeMentionIds(node.content);
};

export type PageCollectionReference = {
  readonly pageId: string;
  readonly spaceId: string;
  readonly viewName?: string;
};

export const extractPageCollectionReferences = (content: PageContent): readonly PageCollectionReference[] =>
  extractPageContentNodeCollections(content.content);

const extractPageContentNodeCollections = (
  nodes: readonly (PageContentNode | PageContentInlineNode)[],
): readonly PageCollectionReference[] => nodes.flatMap(extractPageContentSingleNodeCollections);

const extractPageContentSingleNodeCollections = (
  node: PageContentNode | PageContentInlineNode,
): readonly PageCollectionReference[] => {
  if (node.type === 'collection') return [node.attrs];
  if (!('content' in node)) return [];
  return extractPageContentNodeCollections(node.content);
};
