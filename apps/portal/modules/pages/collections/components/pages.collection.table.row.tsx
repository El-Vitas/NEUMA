import { cn } from '@/lib/utils';
import { TableCell } from '@/shared/components/ui/table';
import { readTableColumnLabelId } from '../lib/pages.table-columns.lib';
import type { PagePersonOption, PageRow, PageSchemaProperty } from '../types/pages.schema.types';
import type { PageTableAppearance } from '../types/pages.table-appearance.types';
import { PagesCollectionRowTitle } from './pages.collection.row-title';
import { PagesCollectionTableCell } from './pages.collection.table.cell';
import { PagesCollectionTableRowCheckbox } from './pages.collection.table.row-checkbox';
import { PagesCollectionTableRowHandle } from './pages.collection.table.row-handle';
import { PagesCollectionTableRowShell } from './pages.collection.table.row-shell';

interface IProps {
  readonly alignmentClasses: Readonly<Record<string, string>>;
  readonly appearance: PageTableAppearance;
  readonly canEdit: boolean;
  readonly collectionPageId: string;
  /** How each column looks when it wraps its text on its own, over what the whole table says. */
  readonly columnAppearances: Readonly<Record<string, PageTableAppearance>>;
  readonly frozenCells: readonly { readonly className?: string; readonly style?: { readonly left: number } }[];
  /** Set when the row is one of a windowed list. */
  readonly index?: number | undefined;
  readonly openFullPageLabel: string;
  readonly personOptions: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly row: PageRow;
  /** The group the row is drawn in: by hand it can only be put among the rows of that group. */
  readonly scope: string;
  readonly selectLabel: string;
  readonly spaceId: string;
  readonly untitledLabel: string;
}

export const PagesCollectionTableRow = ({
  alignmentClasses,
  appearance,
  canEdit,
  collectionPageId,
  columnAppearances,
  frozenCells,
  index,
  openFullPageLabel,
  personOptions,
  properties,
  row,
  scope,
  selectLabel,
  spaceId,
  untitledLabel,
}: IProps) => {
  return (
    <PagesCollectionTableRowShell index={index} rowId={row.id} scope={scope}>
      <TableCell {...frozenCells[0]} className={cn(frozenCells[0]?.className, appearance.cellClass)}>
        <PagesCollectionTableRowHandle rowId={row.id} scope={scope} title={row.title} />
        {canEdit && (
          <span className="mr-2 inline-flex align-middle">
            <PagesCollectionTableRowCheckbox label={selectLabel} rowId={row.id} />
          </span>
        )}
        <PagesCollectionRowTitle
          openFullPageLabel={openFullPageLabel}
          row={row}
          spaceId={spaceId}
          untitledLabel={untitledLabel}
        />
      </TableCell>
      {properties.map((property, position) => {
        const columnAppearance = columnAppearances[property.key] ?? appearance;
        return (
          <TableCell
            key={property.key}
            {...frozenCells[position + 1]}
            className={cn(
              frozenCells[position + 1]?.className,
              columnAppearance.cellClass,
              alignmentClasses[property.key],
            )}
          >
            <PagesCollectionTableCell
              alignmentClass={alignmentClasses[property.key] ?? ''}
              ariaLabelledBy={readTableColumnLabelId(collectionPageId, property.key)}
              canEdit={canEdit}
              contentClass={columnAppearance.contentClass}
              controlClass={columnAppearance.controlClass}
              personOptions={personOptions}
              property={property}
              rowId={row.id}
              spaceId={spaceId}
              value={row.propertyValues?.[property.key]}
            />
          </TableCell>
        );
      })}
    </PagesCollectionTableRowShell>
  );
};
