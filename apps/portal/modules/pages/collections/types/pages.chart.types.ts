import type { PageOptionColor } from '@company-brain/shared';

/** Lo que se dibuja de un grupo: cuánto mide, cómo se llama y de qué color es. */
export interface PageChartPoint {
  readonly color: PageOptionColor | null;
  readonly key: string;
  readonly label: string;
  readonly value: number;
}

/** Una porción de pastel, dicha en grados: desde dónde empieza y cuánto abarca. */
export interface PageChartSlice {
  readonly from: number;
  readonly sweep: number;
}
