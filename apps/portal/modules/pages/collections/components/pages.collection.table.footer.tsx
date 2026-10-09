'use client';

import type { PageViewCalculation } from '@company-brain/shared';
import { listPageCalculationsFor, PAGE_VIEW_CALCULATION, readPageViewConfiguration } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { TableCell, TableFooter, TableRow } from '@/shared/components/ui/table';
import { usePagesCalculationLabel } from '../hooks/use.pages.calculation-label';
import { usePagesViewFiltering } from '../hooks/use.pages.view-filtering';
import { listTableColumnKeys, readTableColumnOffsets, readTableFrozenCellProps } from '../lib/pages.table-columns.lib';
import { readPageCalculation } from '../lib/pages.view-filtering.lib';
import type { PagePropertyValues, PageSchema, PageSchemaProperty } from '../types/pages.schema.types';

interface IProps {
  readonly activeViewName: string;
  readonly canEdit: boolean;
  readonly properties: readonly PageSchemaProperty[];
  readonly rowValues: readonly PagePropertyValues[];
  readonly schema: PageSchema;
  readonly spaceId: string;
}

/** Computed over the rows the filter let through, client-side, so changing a calculation shows instantly. */
export const PagesCollectionTableFooter = ({
  activeViewName,
  canEdit,
  properties,
  rowValues,
  schema,
  spaceId,
}: IProps) => {
  const t = useTranslations('pages.collection');
  const label = usePagesCalculationLabel();
  const filtering = usePagesViewFiltering(schema, activeViewName, spaceId);

  const chosenFor = (propertyKey: string): PageViewCalculation =>
    filtering.calculations[propertyKey] ?? PAGE_VIEW_CALCULATION.NONE;

  const chooseFor = (propertyKey: string, chosen: string): void => {
    const calculation = readPageCalculation(chosen);
    if (calculation !== undefined) filtering.setCalculation(propertyKey, calculation);
  };

  const said = (property: PageSchemaProperty): string =>
    label(
      chosenFor(property.key),
      property,
      rowValues.map((values) => values[property.key]),
    ) ?? t('calculate');

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
                <SelectValue>{said(property)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {listPageCalculationsFor(property.type).map((calculation) => (
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
