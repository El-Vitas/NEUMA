import type { ReactNode } from 'react';
import type { PageViewGroup } from '../types/pages.schema.types';
import { PagesCollectionGroupHeading } from './pages.collection.group-heading';

interface IProps {
  readonly children: ReactNode;
  readonly group: PageViewGroup;
  readonly isGrouped: boolean;
  readonly unassignedLabel: string;
}

/**
 * Un grupo de una colección, con su nombre encima si es que hay grupos.
 *
 * Una colección sin agrupar llega igual en un solo grupo sin nombre, y entonces
 * lo que se ve son sus filas y nada más. Quien lo usa pone dentro las filas con
 * la forma que le toque —una debajo de otra, en cuadrícula—, porque eso es lo
 * único que separa a una vista de otra.
 */
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
