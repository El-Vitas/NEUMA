import type { ReactNode } from 'react';
import type { PageViewGroup } from '../types/pages.schema.types';
import { PagesCollectionGroupHeading } from './pages.collection.group-heading';

interface IProps {
  readonly children: ReactNode;
  readonly group: PageViewGroup;
  readonly isGrouped: boolean;
  readonly unassignedLabel: string;
}

export const PagesCollectionGroupSection = ({ children, group, isGrouped, unassignedLabel }: IProps) => (
  <section aria-label={isGrouped ? group.label : undefined}>
    {isGrouped && (
      <PagesCollectionGroupHeading
        color={group.color}
        groupKey={group.key}
        label={group.label}
        rowCount={group.rows.length}
        unassignedLabel={unassignedLabel}
      />
    )}
    {children}
  </section>
);
