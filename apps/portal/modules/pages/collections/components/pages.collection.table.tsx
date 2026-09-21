import { readPageViewConfiguration } from '@company-brain/shared';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import { buildRowSearchText } from '../lib/pages.row-search.lib';
import { readAlignmentClass, readTableAppearance } from '../lib/pages.table-appearance.lib';
import { listTableColumnKeys, readTableColumnOffsets, readTableFrozenCellProps } from '../lib/pages.table-columns.lib';
import type { PagePersonOption, PageSchema, PageSchemaProperty, PageViewGroup } from '../types/pages.schema.types';
import { PagesCollectionTableFooter } from './pages.collection.table.footer';
import { PagesCollectionTableGroupCalculations } from './pages.collection.table.group-calculations';
import { PagesCollectionTableGroups } from './pages.collection.table.groups';
import { PagesCollectionTableHeader } from './pages.collection.table.header';
import { PagesCollectionTableRow } from './pages.collection.table.row';

interface IProps {
  readonly activeViewName: string;
  readonly canEdit: boolean;
  /**
   * Las filas repartidas en grupos. Una tabla a la que nadie pidió agrupar
   * recibe un solo grupo sin nombre, que es lo mismo que una lista de filas
   * dicho de la manera en que esta tabla sabe dibujarlas.
   */
  readonly groups: readonly PageViewGroup[];
  readonly isGrouped: boolean;
  readonly personOptions?: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly schema: PageSchema;
  readonly spaceId: string;
}

export const PagesCollectionTable = async ({
  activeViewName,
  canEdit,
  groups,
  isGrouped,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  properties,
  schema,
  spaceId,
}: IProps) => {
  const t = await getTranslations('pages');
  const rows = groups.flatMap((group) => group.rows);
  if (rows.length === 0) return <EmptyState message={t('collection.emptyTable')} />;

  const columnKeys = listTableColumnKeys(properties.map((property) => property.key));
  /**
   * Lo guardado, no lo que se esté arrastrando: el cuerpo no sigue al ratón
   * —para eso está el `colgroup` de la cabecera—, solo necesita saber cuáles se
   * quedan quietas y dónde empieza cada una.
   */
  const activeView = schema.views.find((view) => view.name === activeViewName);
  const {
    calculations,
    columnAlignments,
    columnWidths,
    frozenColumns,
    groupBy,
    hidesEmptyGroups,
    rowHeight,
    wrapsText,
  } = readPageViewConfiguration(activeView?.configuration ?? {});
  /** Se resuelve una vez y viaja hecho: si cada celda lo calculara, la misma respuesta se repetiría por fila y columna. */
  const appearance = readTableAppearance(rowHeight, wrapsText);
  const alignmentClasses = Object.fromEntries(
    properties.map((property) => [property.key, readAlignmentClass(columnAlignments, property.key)]),
  );
  /** Lo que cada fila dice en palabras, armado una vez: buscar ocurre al teclear y no puede rehacerlo por letra. */
  const searchTextByRow = Object.fromEntries(rows.map((row) => [row.id, buildRowSearchText(row, properties)]));
  const offsets = readTableColumnOffsets(columnKeys, columnWidths);
  const frozenCells = columnKeys.map((_columnKey, position) =>
    readTableFrozenCellProps(position, frozenColumns, offsets),
  );

  return (
    <PagesCollectionTableHeader
      activeViewName={activeViewName}
      canEdit={canEdit}
      personOptions={personOptions}
      properties={properties}
      rowIds={rows.map((row) => row.id)}
      schema={schema}
      searchTexts={Object.values(searchTextByRow)}
      spaceId={spaceId}
      titleLabel={t('titleField')}
      valuesByRow={Object.fromEntries(rows.map((row) => [row.id, row.propertyValues ?? {}]))}
    >
      <PagesCollectionTableGroups
        activeViewName={activeViewName}
        canEdit={canEdit}
        columnCount={columnKeys.length}
        groupByKey={groupBy ?? ''}
        groups={groups.map((group) => ({
          color: group.color,
          key: group.key,
          label: group.label,
          rowCount: group.rows.length,
          rows: (
            <>
              {group.rows.map((row) => (
                <PagesCollectionTableRow
                  alignmentClasses={alignmentClasses}
                  appearance={appearance}
                  canEdit={canEdit}
                  collectionPageId={schema.pageId}
                  frozenCells={frozenCells}
                  key={row.id}
                  openFullPageLabel={t('sidePanel.openFullPage')}
                  personOptions={personOptions}
                  properties={properties}
                  row={row}
                  searchText={searchTextByRow[row.id] ?? ''}
                  selectLabel={t('collection.selectRow', { title: row.title.length > 0 ? row.title : t('untitled') })}
                  spaceId={spaceId}
                  untitledLabel={t('untitled')}
                />
              ))}
              {isGrouped && (
                <PagesCollectionTableGroupCalculations
                  calculations={calculations}
                  properties={properties}
                  rowValues={group.rows.map((row) => row.propertyValues ?? {})}
                />
              )}
            </>
          ),
        }))}
        hidesEmptyGroups={hidesEmptyGroups}
        isGrouped={isGrouped}
        schema={schema}
        spaceId={spaceId}
      />
      <PagesCollectionTableFooter
        activeViewName={activeViewName}
        canEdit={canEdit}
        properties={properties}
        rowValues={rows.map((row) => row.propertyValues ?? {})}
        schema={schema}
        spaceId={spaceId}
      />
    </PagesCollectionTableHeader>
  );
};
