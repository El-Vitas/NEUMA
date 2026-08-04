import type { PageContent, PageContentNode, PageContentText } from './schemas/page-content.schema.js';

/**
 * Walks a page's ProseMirror-shaped content and returns every leaf text
 * segment in document order. Structural nodes without a `content` field
 * (image, file, embed) contribute nothing.
 */
export const extractPageContentSegments = (content: PageContent): readonly string[] =>
  extractPageContentNodeSegments(content.content).filter((segment) => segment.length > 0);

const extractPageContentNodeSegments = (nodes: readonly (PageContentNode | PageContentText)[]): readonly string[] =>
  nodes.flatMap(extractPageContentSingleNodeSegments);

const extractPageContentSingleNodeSegments = (node: PageContentNode | PageContentText): readonly string[] => {
  if (node.type === 'text') return [node.text];
  if (!('content' in node)) return [];
  return extractPageContentNodeSegments(node.content);
};

export const joinPageContentSegmentsForDisplay = (segments: readonly string[]): string => segments.join('\n\n');

export const joinPageContentSegmentsForSearch = (segments: readonly string[]): string => segments.join(' ');
