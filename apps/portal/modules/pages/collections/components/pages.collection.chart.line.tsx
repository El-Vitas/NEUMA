import { PAGE_CHART_HEIGHT, PAGE_CHART_WIDTH } from '../constants/pages.chart.constants';
import { readChartPointsPath, readChartTopValue } from '../lib/pages.chart.lib';
import type { PageChartPoint } from '../types/pages.chart.types';

interface IProps {
  readonly label: string;
  readonly points: readonly PageChartPoint[];
}

/**
 * Los mismos grupos como una línea, para cuando lo que importa es hacia dónde va.
 *
 * El dibujo se estira al ancho que haya y guarda sus proporciones, así que las
 * cuentas se hacen una vez en sus propias unidades y el navegador se encarga
 * del resto.
 *
 * Los nombres de los grupos van fuera del lienzo, debajo: dentro habría que
 * medir el texto para saber si cabe, y girarlo cuando no.
 */
export const PagesCollectionChartLine = ({ label, points }: IProps) => {
  const values = points.map((point) => point.value);
  const top = readChartTopValue(values);

  return (
    <div className="space-y-2">
      <svg
        className="h-64 w-full text-foreground"
        preserveAspectRatio="none"
        role="img"
        viewBox={`0 0 ${PAGE_CHART_WIDTH} ${PAGE_CHART_HEIGHT}`}
      >
        <title>{label}</title>
        <polyline
          fill="none"
          points={readChartPointsPath(values, top, PAGE_CHART_WIDTH, PAGE_CHART_HEIGHT)}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <ul className="m-0 flex list-none gap-2 p-0">
        {points.map((point) => (
          <li className="min-w-0 flex-1 text-center" key={point.key}>
            <span className="block font-medium text-foreground text-xs tabular-nums">{point.value}</span>
            <span className="block truncate text-muted-foreground text-xs" title={point.label}>
              {point.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
