import type { PageOptionColor } from '@company-brain/shared';

export interface PageChartPoint {
  readonly color: PageOptionColor | null;
  readonly key: string;
  readonly label: string;
  readonly value: number;
}

/** Degrees. */
export interface PageChartSlice {
  readonly from: number;
  readonly sweep: number;
}
