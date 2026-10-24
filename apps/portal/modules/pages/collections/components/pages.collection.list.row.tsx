import type { PagePersonOption, PageRow, PageSchemaProperty } from '../types/pages.schema.types';
import { PagesCollectionCardProperties } from './pages.collection.card-properties';
import { PagesCollectionRowTitle } from './pages.collection.row-title';

interface IProps {
  /** Set when the row is one of a windowed list, which reads its height by this number. */
  readonly index?: number;
  readonly openFullPageLabel: string;
  readonly personOptions: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly row: PageRow;
  readonly spaceId: string;
  readonly untitledLabel: string;
}

export const PagesCollectionListRow = ({
  index,
  openFullPageLabel,
  personOptions,
  properties,
  row,
  spaceId,
  untitledLabel,
}: IProps) => {
  return (
    <li className="border-border/60 border-b px-1 py-2 last:border-b-0" data-index={index}>
      <PagesCollectionRowTitle
        className="w-full justify-between gap-2 text-sm"
        openFullPageLabel={openFullPageLabel}
        row={row}
        spaceId={spaceId}
        untitledLabel={untitledLabel}
      />
      <PagesCollectionCardProperties direction="ROW" personOptions={personOptions} properties={properties} row={row} />
    </li>
  );
};
