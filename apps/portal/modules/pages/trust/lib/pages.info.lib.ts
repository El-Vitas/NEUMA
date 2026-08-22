import { extractPageContentSegments } from '@company-brain/shared';
import { PAGE_INFO_WORD_SEPARATOR } from '../../constants/pages.constants';
import type { PageContent, PageSummary } from '../../types/pages.types';
import type { PageInfoMetadata } from '../types/pages.info.types';

export const countPageContentWords = (content: PageContent): number => {
  const words = extractPageContentSegments(content)
    .join(' ')
    .split(PAGE_INFO_WORD_SEPARATOR)
    .filter((word) => word.length > 0);
  return words.length;
};

export const countPageContentCharacters = (content: PageContent): number =>
  extractPageContentSegments(content).reduce((total, segment) => total + segment.length, 0);

export const toPageInfoMetadata = (page: PageSummary): PageInfoMetadata => ({
  createdAt: page.createdAt,
  createdByName: page.createdBy?.name ?? null,
  lastEditedAt: page.updatedAt,
  lastEditedByName: page.updatedBy?.name ?? null,
});
