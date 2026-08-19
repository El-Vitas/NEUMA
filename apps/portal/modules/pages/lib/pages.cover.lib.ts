import { PAGE_COVER_POSITION_MAX, PAGE_COVER_POSITION_MIN } from '../constants/pages.cover.constants';
import type { PageCoverValue } from '../types/pages.cover.types';
import { resolvePageAssetUrl } from './pages.attachments.lib';

export const resolvePageCoverImageUrl = (cover: PageCoverValue): string => resolvePageAssetUrl(cover.assetId);

export const clampPageCoverPosition = (position: number): number =>
  Math.min(PAGE_COVER_POSITION_MAX, Math.max(PAGE_COVER_POSITION_MIN, Math.round(position)));

/**
 * Where the framing lands after dragging by `deltaY`.
 *
 * Dragging down shows more of the top of the picture, so the movement is read
 * the way a hand moves the image behind a window rather than the window itself.
 */
export const computePageCoverDragPosition = (
  startPosition: number,
  deltaY: number,
  containerHeight: number,
): number => {
  if (containerHeight <= 0) return startPosition;
  return clampPageCoverPosition(startPosition - (deltaY / containerHeight) * 100);
};
