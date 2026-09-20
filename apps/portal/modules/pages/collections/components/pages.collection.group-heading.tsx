import type { PageOptionColor } from '@company-brain/shared';
import { UNASSIGNED_GROUP_KEY } from '@company-brain/shared';
import { cn } from '@/lib/utils';
import { readPageOptionDotClass } from '../lib/pages.option-color.lib';

interface IProps {
  readonly color: null | PageOptionColor;
  readonly groupKey: string;
  readonly label: string;
  readonly rowCount: number;
  /** Ya traducido por quien dibuja la vista, para las filas que no respondieron esa propiedad. */
  readonly unassignedLabel: string;
}

/**
 * Por qué valor va este tramo de filas, y cuántas son.
 *
 * Lo dicen igual la lista y la galería: agrupar es lo mismo en las dos, y lo
 * único que cambia es lo que viene debajo del encabezado.
 */
export const PagesCollectionGroupHeading = ({ color, groupKey, label, rowCount, unassignedLabel }: IProps) => {
  return (
    <h3 className="flex items-center gap-2 pb-2 font-medium text-foreground text-sm">
      <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', readPageOptionDotClass(color))} />
      {groupKey === UNASSIGNED_GROUP_KEY ? unassignedLabel : label}
      <span className="font-normal text-muted-foreground tabular-nums">{rowCount}</span>
    </h3>
  );
};
