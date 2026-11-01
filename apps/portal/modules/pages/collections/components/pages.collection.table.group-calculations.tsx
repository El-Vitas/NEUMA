'use client';

import type { PageViewCalculation } from '@neuma/shared';
import { PAGE_VIEW_CALCULATION } from '@neuma/shared';
import { Suspense } from 'react';
import { TableCell, TableRow } from '@/shared/components/ui/table';
import type { PageSchemaProperty, PageViewAggregates } from '../types/pages.schema.types';
import { PagesCollectionCalculationValue } from './pages.collection.calculation-value';

interface IProps {
  readonly aggregates: Promise<PageViewAggregates | null>;
  readonly calculations: Readonly<Record<string, PageViewCalculation>>;
  readonly groupKey: string;
  readonly properties: readonly PageSchemaProperty[];
}

/** Applies the view-wide calculation to one group; it is never chosen per group. */
export const PagesCollectionTableGroupCalculations = ({ aggregates, calculations, groupKey, properties }: IProps) => {
  const chosen = (property: PageSchemaProperty): PageViewCalculation =>
    calculations[property.key] ?? PAGE_VIEW_CALCULATION.NONE;

  if (properties.every((property) => chosen(property) === PAGE_VIEW_CALCULATION.NONE)) return null;

  return (
    <TableRow data-testid="collection-table-group-calculations">
      <TableCell />
      {properties.map((property) => (
        <TableCell className="text-muted-foreground text-xs" key={property.key}>
          {chosen(property) !== PAGE_VIEW_CALCULATION.NONE && (
            <Suspense fallback={null}>
              <PagesCollectionCalculationValue
                aggregates={aggregates}
                calculation={chosen(property)}
                groupKey={groupKey}
                propertyKey={property.key}
              />
            </Suspense>
          )}
        </TableCell>
      ))}
    </TableRow>
  );
};
