import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import type {
  PagePersonOption,
  PageSchemaProperty,
  PageViewAggregates,
  PageViewGroup,
} from '../types/pages.schema.types';
import { PagesCollectionGroupSection } from './pages.collection.group-section';
import { PagesCollectionListMoreRows } from './pages.collection.list.more-rows';
import { PagesCollectionListRow } from './pages.collection.list.row';

interface IProps {
  readonly aggregates: Promise<PageViewAggregates | null>;
  readonly groups: readonly PageViewGroup[];
  readonly isGrouped: boolean;
  /** Where the rows of an ungrouped list end; the groups carry their own. */
  readonly nextCursor: null | string;
  readonly pageId: string;
  readonly personOptions?: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly spaceId: string;
  readonly viewId: string;
}

export const PagesCollectionList = async ({
  aggregates,
  groups,
  isGrouped,
  nextCursor,
  pageId,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  properties,
  spaceId,
  viewId,
}: IProps) => {
  const t = await getTranslations('pages');
  if (groups.every((group) => group.rows.length === 0)) return <EmptyState message={t('collection.emptyTable')} />;

  return (
    <div className="space-y-4" data-testid="collection-list">
      {groups.map((group) => {
        const firstCursor = isGrouped ? (group.nextCursor ?? null) : nextCursor;
        return (
          <PagesCollectionGroupSection
            aggregates={aggregates}
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
              {firstCursor !== null && (
                <PagesCollectionListMoreRows
                  paging={{
                    drawnRowIds: group.rows.map((row) => row.id),
                    firstCursor,
                    ...(isGrouped ? { group: { key: group.key } } : {}),
                    pageId,
                    spaceId,
                    viewId,
                  }}
                  personOptions={personOptions}
                  properties={properties}
                  spaceId={spaceId}
                />
              )}
            </ul>
          </PagesCollectionGroupSection>
        );
      })}
    </div>
  );
};
