import type { PageContentInlineNode, PageContentNode } from '@/modules/pages/types/pages.types';

export const structuredToggleNodeFixture: PageContentNode = {
  attrs: { open: false, summary: 'Details' },
  content: [{ content: [{ text: 'Nested', type: 'text' }], type: 'paragraph' }],
  type: 'toggle',
};

export const structuredEmbedNodeFixture: PageContentNode = {
  attrs: { provider: 'youtube', url: 'https://www.youtube.com/watch?v=abc123' },
  type: 'embed',
};

export const structuredMentionNodeFixture: PageContentInlineNode = {
  attrs: { label: 'Target Page', pageId: 'page-target', spaceId: 'space-target' },
  type: 'mention',
};
