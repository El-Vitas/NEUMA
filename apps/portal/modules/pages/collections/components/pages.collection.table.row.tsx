import { cn } from '@/lib/utils';
import { TableCell } from '@/shared/components/ui/table';
import { readTableColumnLabelId } from '../lib/pages.table-columns.lib';
import type { PagePersonOption, PageRow, PageSchemaProperty } from '../types/pages.schema.types';
import type { PageTableAppearance } from '../types/pages.table-appearance.types';
import { PagesCollectionRowTitle } from './pages.collection.row-title';
import { PagesCollectionTableCell } from './pages.collection.table.cell';
import { PagesCollectionTableRowCheckbox } from './pages.collection.table.row-checkbox';
import { PagesCollectionTableRowShell } from './pages.collection.table.row-shell';

interface IProps {
  /** La clase de alineación de cada columna, ya resuelta por quien dibuja la tabla. */
  readonly alignmentClasses: Readonly<Record<string, string>>;
  /** Cuánto aire lleva cada celda y cómo se corta lo que dice, ya resuelto: toda la tabla se ve igual. */
  readonly appearance: PageTableAppearance;
  readonly canEdit: boolean;
  readonly collectionPageId: string;
  /** Lo que deja quieta a cada columna al desplazarse, ya resuelto y en el orden de las columnas. */
  readonly frozenCells: readonly { readonly className?: string; readonly style?: { readonly left: number } }[];
  /** Ya traducidos por quien dibuja la tabla: una fila no tiene por qué ir a buscar palabras. */
  readonly openFullPageLabel: string;
  readonly personOptions: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly row: PageRow;
  /** Lo que esta fila dice en palabras, para el buscador de la colección. */
  readonly searchText: string;
  /** Ya traducido por quien dibuja la tabla, con el nombre de la fila dentro. */
  readonly selectLabel: string;
  readonly spaceId: string;
  readonly untitledLabel: string;
}

/**
 * Una fila de la tabla: su nombre, que es lo que la abre, y lo que guarda bajo
 * cada columna.
 */
export const PagesCollectionTableRow = ({
  alignmentClasses,
  appearance,
  canEdit,
  collectionPageId,
  frozenCells,
  openFullPageLabel,
  personOptions,
  properties,
  row,
  searchText,
  selectLabel,
  spaceId,
  untitledLabel,
}: IProps) => {
  return (
    <PagesCollectionTableRowShell searchText={searchText}>
      <TableCell {...frozenCells[0]} className={cn(frozenCells[0]?.className, appearance.cellClass)}>
        {/* La casilla acompaña al nombre en vez de tener columna propia: una columna más movería todas las demás. */}
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
      {properties.map((property, position) => (
        <TableCell
          key={property.key}
          {...frozenCells[position + 1]}
          className={cn(frozenCells[position + 1]?.className, appearance.cellClass, alignmentClasses[property.key])}
        >
          <PagesCollectionTableCell
            alignmentClass={alignmentClasses[property.key] ?? ''}
            ariaLabelledBy={readTableColumnLabelId(collectionPageId, property.key)}
            canEdit={canEdit}
            contentClass={appearance.contentClass}
            controlClass={appearance.controlClass}
            personOptions={personOptions}
            property={property}
            rowId={row.id}
            spaceId={spaceId}
            value={row.propertyValues?.[property.key]}
          />
        </TableCell>
      ))}
    </PagesCollectionTableRowShell>
  );
};
