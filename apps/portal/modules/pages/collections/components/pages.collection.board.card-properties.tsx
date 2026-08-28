'use client';

import { hasPropertyValueToShow } from '../lib/pages.properties.lib';
import type { PageRow, PageSchemaProperty } from '../types/pages.schema.types';
import { PagesPropertyValue } from './pages.properties.value';

interface IProps {
  readonly properties: readonly PageSchemaProperty[];
  readonly row: PageRow;
}

/**
 * What a card says besides its title.
 *
 * Only the properties that carry something are drawn: a card is small, and a
 * row of empty labels costs the space that the ones with an answer need.
 */
export const PagesCollectionBoardCardProperties = ({ properties, row }: IProps) => {
  const answered = properties.filter((property) => hasPropertyValueToShow(row.propertyValues?.[property.key]));
  if (answered.length === 0) return null;

  return (
    <dl className="m-0 flex flex-wrap gap-1 text-xs">
      {answered.map((property) => (
        <div className="flex items-center gap-1" key={property.key}>
          <dt className="sr-only">{property.label}</dt>
          <dd className="m-0">
            <PagesPropertyValue property={property} value={row.propertyValues?.[property.key]} />
          </dd>
        </div>
      ))}
    </dl>
  );
};
