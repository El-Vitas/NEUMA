import { describe, expect, it } from 'bun:test';
import {
  clampPageCoverPosition,
  computePageCoverDragPosition,
  resolvePageCoverImageUrl,
} from '@/modules/pages/appearance/lib/pages.cover.lib';

describe('where a cover is framed', () => {
  it('keeps the framing inside the picture', () => {
    expect(clampPageCoverPosition(-40)).toBe(0);
    expect(clampPageCoverPosition(140)).toBe(100);
    expect(clampPageCoverPosition(37.4)).toBe(37);
  });

  it('follows the hand rather than the window', () => {
    expect(computePageCoverDragPosition(50, 40, 200)).toBe(30);
    expect(computePageCoverDragPosition(50, -40, 200)).toBe(70);
  });

  it('does not move at all when there is no height to measure against', () => {
    expect(computePageCoverDragPosition(50, 80, 0)).toBe(50);
  });

  it('stops at the edges however far the drag goes', () => {
    expect(computePageCoverDragPosition(50, 4000, 200)).toBe(0);
    expect(computePageCoverDragPosition(50, -4000, 200)).toBe(100);
  });

  it('points at the stored asset', () => {
    expect(resolvePageCoverImageUrl({ assetId: 'asset-1', position: 50 })).toContain('asset-1');
  });
});
