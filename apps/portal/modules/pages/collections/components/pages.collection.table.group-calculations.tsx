'use client';

import type { PageViewCalculation } from '@company-brain/shared';
import { PAGE_VIEW_CALCULATION } from '@company-brain/shared';
import { TableCell, TableRow } from '@/shared/components/ui/table';
import { usePagesCalculationLabel } from '../hooks/use.pages.calculation-label';
import type { PagePropertyValues, PageSchemaProperty } from '../types/pages.schema.types';

interface IProps {
  /** Qué dice al pie cada columna, ya elegido para toda la vista. */
  readonly calculations: Readonly<Record<string, PageViewCalculation>>;
  readonly properties: readonly PageSchemaProperty[];
  readonly rowValues: readonly PagePropertyValues[];
}

/**
 * Lo que cada columna dice de las filas de este grupo.
 *
 * Repite la cuenta que ya se eligió para la vista, aplicada solo a lo que hay
 * dentro del grupo. Aquí no se elige nada: elegir es de la vista entera, y
 * ofrecerlo una vez por grupo daría a entender que cada grupo puede contar una
 * cosa distinta.
 */
export const PagesCollectionTableGroupCalculations = ({ calculations, properties, rowValues }: IProps) => {
  const label = usePagesCalculationLabel();

  const said = (property: PageSchemaProperty): null | string =>
    label(
      calculations[property.key] ?? PAGE_VIEW_CALCULATION.NONE,
      property,
      rowValues.map((values) => values[property.key]),
    );

  /** Un grupo sin filas no tiene nada que contar, y su franja ya dice que está vacío. */
  if (rowValues.length === 0 || properties.every((property) => said(property) === null)) return null;

  return (
    <TableRow data-testid="collection-table-group-calculations">
      <TableCell />
      {properties.map((property) => (
        <TableCell className="text-muted-foreground text-xs" key={property.key}>
          {said(property)}
        </TableCell>
      ))}
    </TableRow>
  );
};
