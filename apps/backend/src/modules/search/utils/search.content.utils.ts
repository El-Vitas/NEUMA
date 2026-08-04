import type { PageContent } from '@company-brain/shared';
import { extractPageContentSegments, joinPageContentSegmentsForSearch } from '@company-brain/shared';

export const extractPageContentText = (content: PageContent): string =>
  joinPageContentSegmentsForSearch(extractPageContentSegments(content));
