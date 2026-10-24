'use client';

import type { PageViewCalculation } from '@neuma/shared';
import {
  listPageCalculationsFor,
  PAGE_VIEW_CALCULATION,
  readPageEffectivePropertyType,
  readPageViewConfiguration,
} from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { Suspense } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { TableCell, TableFooter, TableRow } from '@/shared/components/ui/table';
import { usePagesViewFiltering } from '../hooks/use.pages.view-filtering';
import { listTableColumnKeys, readTableColumnOffsets, readTableFrozenCellProps } from '../lib/pages.table-columns.lib';
import { readPageCalculation } from '../lib/pages.view-filtering.lib';
import type { PageSchema, PageSchemaProperty, PageViewAggregates } from '../types/pages.schema.types';
import { PagesCollectionCalculationValue } from './pages.collection.calculation-value';

interface IProps {
  readonly activeViewName: string;
  readonly aggregates: Promise<PageViewAggregates | null>;
  readonly canEdit: boolean;
  readonly properties: readonly PageSchemaProperty[];
  readonly schema: PageSchema;
  readonly spaceId: string;
}

/** Computed by the database over every row the filter lets through, so it is right however many rows are drawn. */
export const PagesCollectionTableFooter = ({
  activeViewName,
  aggregates,
  canEdit,
  properties,
  schema,
  spaceId,
}: IProps) => {
  const t = useTranslations('pages.collection');
  const filtering = usePagesViewFiltering(schema, activeViewName, spaceId);

  const chosenFor = (propertyKey: string): PageViewCalculation =>
    filtering.calculations[propertyKey] ?? PAGE_VIEW_CALCULATION.NONE;

  const chooseFor = (propertyKey: string, chosen: string): void => {
    const calculation = readPageCalculation(chosen);
    if (calculation !== undefined) filtering.setCalculation(propertyKey, calculation);
  };

  const columnKeys = listTableColumnKeys(properties.map((property) => property.key));
  const activeView = schema.views.find((view) => view.name === activeViewName);
  const { columnWidths, frozenColumns } = readPageViewConfiguration(activeView?.configuration ?? {});
  const offsets = readTableColumnOffsets(columnKeys, columnWidths);
  const frozenCell = (position: number) => readTableFrozenCellProps(position, frozenColumns, offsets);

  if (!canEdit) return null;

  return (
    <TableFooter data-testid="collection-table-footer">
      <TableRow>
        <TableCell {...frozenCell(0)} />
        {properties.map((property, position) => (
          <TableCell key={property.key} {...frozenCell(position + 1)}>
            <Select
              disabled={filtering.isSaving}
              onValueChange={(chosen) => chooseFor(property.key, chosen)}
              value={chosenFor(property.key)}
            >
              <SelectTrigger
                aria-label={t('calculateFor', { property: property.label })}
                className="w-full rounded-none border-transparent bg-transparent px-2 text-muted-foreground text-xs shadow-none hover:border-border data-[size=default]:h-11 dark:bg-transparent"
                data-testid="collection-calculation"
              >
                <SelectValue>
                  {chosenFor(property.key) === PAGE_VIEW_CALCULATION.NONE ? (
                    t('calculate')
                  ) : (
                    <Suspense fallback={t('calculating')}>
                      <PagesCollectionCalculationValue
                        aggregates={aggregates}
                        calculation={chosenFor(property.key)}
                        propertyKey={property.key}
                      />
                    </Suspense>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {listPageCalculationsFor(readPageEffectivePropertyType(property)).map((calculation) => (
                  <SelectItem key={calculation} value={calculation}>
                    {t(`calculations.${calculation}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TableCell>
        ))}
      </TableRow>
    </TableFooter>
  );
};
