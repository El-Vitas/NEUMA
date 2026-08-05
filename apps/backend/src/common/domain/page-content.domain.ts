import { extractPageMentionIds, pageContentSchema } from '@company-brain/shared';

export const extractPageContentMentionIds = (content: unknown): readonly string[] | null => {
  const parsedContent = pageContentSchema.safeParse(content);
  return parsedContent.success ? extractPageMentionIds(parsedContent.data) : null;
};
