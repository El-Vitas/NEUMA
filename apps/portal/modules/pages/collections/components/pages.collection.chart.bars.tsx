import { cn } from '@/lib/utils';
import { readChartTopValue } from '../lib/pages.chart.lib';
import { readPageOptionDotClass } from '../lib/pages.option-color.lib';
import type { PageChartPoint } from '../types/pages.chart.types';

interface IProps {
  readonly points: readonly PageChartPoint[];
}

/**
 * Cuánto hay en cada grupo, como barras.
 *
 * Van dibujadas con cajas y no en un lienzo: una barra es un rectángulo con un
 * nombre debajo, y hecha así se lee con lupa, se selecciona y se traduce sin
 * que nadie tenga que medir texto a mano.
 *
 * El alto arranca del suelo, no del valor más chico: una barra que empieza en
 * otro sitio exagera diferencias que no existen. Y cada barra tiene un tope de
 * ancho, porque una tan ancha como alta deja de leerse como una medida y pasa a
 * ser un bloque de color.
 */
export const PagesCollectionChartBars = ({ points }: IProps) => {
  const top = readChartTopValue(points.map((point) => point.value));

  return (
    <ul className="m-0 flex h-72 list-none items-stretch gap-4 p-0">
      {points.map((point) => (
        <li className="flex min-w-0 flex-1 flex-col items-center gap-2" key={point.key}>
          <div className="flex w-full flex-1 flex-col justify-end gap-2 border-border border-b">
            <span className="text-center font-medium text-foreground text-xs tabular-nums">{point.value}</span>
            <div
              className={cn('mx-auto w-full max-w-24 rounded-t-sm', readPageOptionDotClass(point.color))}
              style={{ height: `${(point.value / top) * 100}%` }}
            />
          </div>
          <span className="w-full truncate text-center text-muted-foreground text-xs" title={point.label}>
            {point.label}
          </span>
        </li>
      ))}
    </ul>
  );
};
