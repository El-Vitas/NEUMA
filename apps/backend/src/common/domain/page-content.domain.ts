import { extractPageMentionIds, readStoredPageContent } from '@company-brain/shared';

export const extractPageContentMentionIds = (content: unknown): readonly string[] | null => {
  const storedContent = readStoredPageContent(content);
  return storedContent === null ? null : extractPageMentionIds(storedContent);
};
