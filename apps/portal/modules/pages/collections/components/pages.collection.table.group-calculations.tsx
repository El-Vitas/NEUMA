'use client';

import type { PageViewCalculation } from '@neuma/shared';
import { PAGE_VIEW_CALCULATION } from '@neuma/shared';
import { TableCell, TableRow } from '@/shared/components/ui/table';
import { usePagesCalculationLabel } from '../hooks/use.pages.calculation-label';
import type { PagePropertyValues, PageSchemaProperty } from '../types/pages.schema.types';

interface IProps {
  readonly calculations: Readonly<Record<string, PageViewCalculation>>;
  readonly properties: readonly PageSchemaProperty[];
  readonly rowValues: readonly PagePropertyValues[];
}

/** Applies the view-wide calculation to one group; it is never chosen per group. */
export const PagesCollectionTableGroupCalculations = ({ calculations, properties, rowValues }: IProps) => {
  const label = usePagesCalculationLabel();

  const said = (property: PageSchemaProperty): null | string =>
    label(
      calculations[property.key] ?? PAGE_VIEW_CALCULATION.NONE,
      property,
      rowValues.map((values) => values[property.key]),
    );

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
