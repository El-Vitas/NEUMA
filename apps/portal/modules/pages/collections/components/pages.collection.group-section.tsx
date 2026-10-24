import type { ReactNode } from 'react';
import type { PageViewAggregates, PageViewGroup } from '../types/pages.schema.types';
import { PagesCollectionGroupCount } from './pages.collection.group-count';
import { PagesCollectionGroupHeading } from './pages.collection.group-heading';

interface IProps {
  readonly aggregates: Promise<PageViewAggregates | null>;
  readonly children: ReactNode;
  readonly group: PageViewGroup;
  readonly isGrouped: boolean;
  readonly unassignedLabel: string;
}

export const PagesCollectionGroupSection = ({ aggregates, children, group, isGrouped, unassignedLabel }: IProps) => (
  <section aria-label={isGrouped ? group.label : undefined}>
    {isGrouped && (
      <PagesCollectionGroupHeading
        color={group.color}
        count={<PagesCollectionGroupCount aggregates={aggregates} drawn={group.rows.length} groupKey={group.key} />}
        groupKey={group.key}
        label={group.label}
        unassignedLabel={unassignedLabel}
      />
    )}
    {children}
  </section>
);
