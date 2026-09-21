import { Card } from '@/shared/components/ui/card';
import type { PagePersonOption, PageRow, PageSchemaProperty } from '../types/pages.schema.types';
import { PagesCollectionCardProperties } from './pages.collection.card-properties';
import { PagesCollectionRowTitle } from './pages.collection.row-title';

interface IProps {
  readonly openFullPageLabel: string;
  readonly personOptions: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly row: PageRow;
  readonly spaceId: string;
  readonly untitledLabel: string;
}

/**
 * Una fila de la colección como una tarjeta de la galería.
 *
 * Se parece a la del tablero y no es la misma: aquí la tarjeta no se arrastra a
 * ninguna parte —no hay columnas a las que llevarla—, así que no carga con
 * nada de lo que hace falta para moverla.
 */
export const PagesCollectionGalleryCard = ({
  openFullPageLabel,
  personOptions,
  properties,
  row,
  spaceId,
  untitledLabel,
}: IProps) => {
  return (
    <Card
      className="h-full gap-2 rounded-md border-border/60 p-3 text-sm shadow-xs transition-shadow hover:shadow-sm"
      data-testid="collection-gallery-card"
    >
      <PagesCollectionRowTitle
        className="w-full items-start justify-between gap-2 font-medium"
        openFullPageLabel={openFullPageLabel}
        row={row}
        spaceId={spaceId}
        untitledLabel={untitledLabel}
      />
      <PagesCollectionCardProperties
        direction="COLUMN"
        personOptions={personOptions}
        properties={properties}
        row={row}
      />
    </Card>
  );
};
