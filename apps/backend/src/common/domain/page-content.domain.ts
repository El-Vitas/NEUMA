import { extractPageMentionIds, readStoredPageContent } from '@neuma/shared';

export const extractPageContentMentionIds = (content: unknown): readonly string[] | null => {
  const storedContent = readStoredPageContent(content);
  return storedContent === null ? null : extractPageMentionIds(storedContent);
};
