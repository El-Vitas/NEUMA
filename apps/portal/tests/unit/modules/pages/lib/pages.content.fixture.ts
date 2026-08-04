import type { PageContentNode } from '@/modules/pages/types/pages.types';

export const structuredToggleNodeFixture: PageContentNode = {
  attrs: { summary: 'Details' },
  content: [{ content: [{ text: 'Nested', type: 'text' }], type: 'paragraph' }],
  type: 'toggle',
};

export const structuredEmbedNodeFixture: PageContentNode = {
  attrs: { provider: 'youtube', url: 'https://www.youtube.com/watch?v=abc123' },
  type: 'embed',
};
