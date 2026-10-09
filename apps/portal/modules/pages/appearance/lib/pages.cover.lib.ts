import { resolvePageAssetUrl } from '../../attachments/lib/pages.attachments.lib';
import { PAGE_COVER_POSITION_MAX, PAGE_COVER_POSITION_MIN } from '../constants/pages.cover.constants';
import type { PageCoverValue } from '../types/pages.cover.types';

export const resolvePageCoverImageUrl = (cover: PageCoverValue): string => resolvePageAssetUrl(cover.assetId);

export const clampPageCoverPosition = (position: number): number =>
  Math.min(PAGE_COVER_POSITION_MAX, Math.max(PAGE_COVER_POSITION_MIN, Math.round(position)));

/** Dragging down moves the image, not the window, so it reveals more of the top. */
export const computePageCoverDragPosition = (
  startPosition: number,
  deltaY: number,
  containerHeight: number,
): number => {
  if (containerHeight <= 0) return startPosition;
  return clampPageCoverPosition(startPosition - (deltaY / containerHeight) * 100);
};
