import type { PageContent, PageContentNode } from '@company-brain/shared';

const extractNodeText = (node: PageContentNode): readonly string[] => {
  if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'code_block')
    return node.content.map((textNode) => textNode.text);
  return node.content.flatMap(extractNodeText);
};

export const extractPageContentText = (content: PageContent): string =>
  content.content.flatMap(extractNodeText).join(' ');
