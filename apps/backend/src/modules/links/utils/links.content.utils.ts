import { extractPageContentMentionIds } from '@/common/domain/page-content.domain';

export const extractLinkTargetPageIds = (content: unknown): readonly string[] | null =>
  extractPageContentMentionIds(content);
