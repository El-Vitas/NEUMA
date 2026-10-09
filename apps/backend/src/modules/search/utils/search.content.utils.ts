import type { PageContent } from '@neuma/shared';
import { extractPageContentSegments, joinPageContentSegmentsForSearch } from '@neuma/shared';

export const extractPageContentText = (content: PageContent): string =>
  joinPageContentSegmentsForSearch(extractPageContentSegments(content));
