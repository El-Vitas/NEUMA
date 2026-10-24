import { extractPageContentSegments, joinPageContentSegmentsForDisplay } from '@neuma/shared';
import { BRAND_NAME } from '@/shared/constants/brand.constants';
import type { PageContent, PageLifecycle, PageSummary } from '../types/pages.types';

/** The backend decides by the viewer's role on the page itself; the trash only closes it further. */
export const canEditPage = (page: Pick<PageSummary, 'canEdit' | 'lifecycle'>): boolean =>
  page.canEdit && page.lifecycle !== 'TRASHED';

/** Page name first: a row of tabs is read by its first word. */
export const buildPageDocumentTitle = (title: string, untitledLabel: string): string => {
  const writtenTitle = title.trim();
  return `${writtenTitle.length > 0 ? writtenTitle : untitledLabel} · ${BRAND_NAME}`;
};

/** Trash and lock have different ways out, so each gets its own message instead of a generic "read only". */
export const resolveReadOnlyMessage = (
  lifecycle: PageLifecycle,
  isLocked: boolean,
  say: (key: string) => string,
  isBlockSyncUnavailable = false,
): string => {
  if (isBlockSyncUnavailable) return say('blockSyncUnavailable');
  if (lifecycle === 'TRASHED') return say('trashReadOnly');
  return isLocked ? say('lock.banner') : say('readOnly');
};

export const extractPageText = (content: PageContent): string =>
  joinPageContentSegmentsForDisplay(extractPageContentSegments(content));
