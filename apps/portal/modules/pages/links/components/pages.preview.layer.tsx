'use client';

import type { PagePreviewAtHand, PagePreviewOutcome } from '../types/pages.preview.types';
import { PagesPreviewCard } from './pages.preview.card';

interface IProps {
  readonly atHand: PagePreviewAtHand | null;
  readonly onHold: () => void;
  readonly onLetGo: () => void;
  readonly outcome: PagePreviewOutcome | null;
}

export const PagesPreviewLayer = ({ atHand, onHold, onLetGo, outcome }: IProps) => {
  if (atHand === null) return null;

  return (
    <div className="absolute z-40" style={{ left: `${atHand.spot.left}px`, top: `${atHand.spot.top}px` }}>
      <PagesPreviewCard onHold={onHold} onLetGo={onLetGo} outcome={outcome} target={atHand.target} />
    </div>
  );
};
