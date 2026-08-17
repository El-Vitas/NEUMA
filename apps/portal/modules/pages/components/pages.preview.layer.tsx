'use client';

import type { PagePreviewAtHand, PagePreviewOutcome } from '../types/pages.preview.types';
import { PagesPreviewCard } from './pages.preview.card';

interface IProps {
  readonly atHand: PagePreviewAtHand | null;
  readonly outcome: PagePreviewOutcome | null;
}

/**
 * Where a page's own preview stands, once a mention or a link to it has been
 * rested on for long enough to be worth asking about.
 *
 * Nothing is drawn while nothing is being rested on: a card sitting empty
 * over the writing would be in the way of exactly what it is meant to stay
 * out of.
 */
export const PagesPreviewLayer = ({ atHand, outcome }: IProps) => {
  if (atHand === null) return null;

  return (
    <div className="absolute z-40" style={{ left: `${atHand.spot.left}px`, top: `${atHand.spot.top}px` }}>
      <PagesPreviewCard outcome={outcome} />
    </div>
  );
};
