import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import type { PagePersonOption, PageSchemaProperty, PageViewGroup } from '../types/pages.schema.types';
import { PagesCollectionGroupSection } from './pages.collection.group-section';
import { PagesCollectionListRow } from './pages.collection.list.row';

interface IProps {
  /**
   * Las filas repartidas en grupos. Una lista a la que nadie pidió agrupar
   * recibe un solo grupo sin nombre, que es la lista entera de corrido.
   */
  readonly groups: readonly PageViewGroup[];
  readonly isGrouped: boolean;
  readonly personOptions?: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly spaceId: string;
}

/**
 * Las filas de una colección una debajo de otra, sin cuadrícula.
 *
 * Es la vista para cuando cada fila es algo que se lee —una nota, un documento—
 * y no un dato que se compara con el de al lado: sin columnas, el nombre ocupa
 * el ancho que necesita y lo demás acompaña en pequeño.
 */
export const PagesCollectionList = async ({
  groups,
  isGrouped,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  properties,
  spaceId,
}: IProps) => {
  const t = await getTranslations('pages');
  if (groups.every((group) => group.rows.length === 0)) return <EmptyState message={t('collection.emptyTable')} />;

  return (
    <div className="space-y-4" data-testid="collection-list">
      {groups.map((group) => (
        <PagesCollectionGroupSection
          group={group}
          isGrouped={isGrouped}
          key={group.key}
          unassignedLabel={t('collection.unassignedGroup')}
        >
          <ul className="m-0 list-none p-0">
            {group.rows.map((row) => (
              <PagesCollectionListRow
                key={row.id}
                openFullPageLabel={t('sidePanel.openFullPage')}
                personOptions={personOptions}
                properties={properties}
                row={row}
                spaceId={spaceId}
                untitledLabel={t('untitled')}
              />
            ))}
          </ul>
        </PagesCollectionGroupSection>
      ))}
    </div>
  );
};
