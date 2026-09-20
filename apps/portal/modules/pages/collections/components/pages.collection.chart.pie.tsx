import { cn } from '@/lib/utils';
import { PAGE_CHART_PIE_RADIUS } from '../constants/pages.chart.constants';
import { describePieSlicePath, readChartSlices } from '../lib/pages.chart.lib';
import { readPageOptionDotClass, readPageOptionFillClass } from '../lib/pages.option-color.lib';
import type { PageChartPoint } from '../types/pages.chart.types';

interface IProps {
  readonly label: string;
  readonly points: readonly PageChartPoint[];
}

/**
 * Qué parte del total se lleva cada grupo.
 *
 * El pastel va acompañado siempre de su lista con los números: de un arco no se
 * lee cuánto vale, y dos porciones parecidas son indistinguibles a ojo. Esa
 * lista es además lo que hace que el dibujo diga algo para quien no distingue
 * los colores.
 */
export const PagesCollectionChartPie = ({ label, points }: IProps) => {
  const slices = readChartSlices(points.map((point) => point.value));
  const diameter = PAGE_CHART_PIE_RADIUS * 2;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg className="size-64 shrink-0" role="img" viewBox={`0 0 ${diameter} ${diameter}`}>
        <title>{label}</title>
        {slices.map((slice, index) => (
          <path
            className={readPageOptionFillClass(points[index]?.color ?? null)}
            d={describePieSlicePath(slice, PAGE_CHART_PIE_RADIUS)}
            key={points[index]?.key ?? index}
          />
        ))}
      </svg>
      <ul className="m-0 min-w-0 flex-1 list-none space-y-1 p-0">
        {points.map((point) => (
          <li className="flex items-center gap-2 text-sm" key={point.key}>
            <span
              aria-hidden="true"
              className={cn('size-2 shrink-0 rounded-full', readPageOptionDotClass(point.color))}
            />
            <span className="min-w-0 flex-1 truncate text-foreground">{point.label}</span>
            <span className="text-muted-foreground tabular-nums">{point.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
