'use client';

import { EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import { hasPropertyValueToShow } from '../lib/pages.properties.lib';
import type { PagePersonOption, PageRow, PageSchemaProperty } from '../types/pages.schema.types';
import { PagesPropertyValue } from './pages.properties.value';

interface IProps {
  readonly personOptions?: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly row: PageRow;
}

/**
 * Lo que una tarjeta dice además de su título.
 *
 * Solo se dibuja lo que lleva algo: una tarjeta es pequeña, y una fila de
 * etiquetas vacías ocupa el sitio de las que sí respondieron.
 *
 * Una propiedad por línea, no varias apretadas en la misma. Con dos o tres
 * cabría, pero una vista que enseña seis las dejaría ilegibles, y quien mira
 * una tarjeta lee de arriba abajo.
 */
export const PagesCollectionBoardCardProperties = ({
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  properties,
  row,
}: IProps) => {
  const answered = properties.filter((property) => hasPropertyValueToShow(row.propertyValues?.[property.key]));
  if (answered.length === 0) return null;

  return (
    <dl className="m-0 flex flex-col gap-1 text-muted-foreground text-xs">
      {answered.map((property) => (
        <div className="flex min-w-0 items-center gap-1" key={property.key}>
          <dt className="sr-only">{property.label}</dt>
          <dd className="m-0 min-w-0 truncate">
            <PagesPropertyValue
              personOptions={personOptions}
              property={property}
              value={row.propertyValues?.[property.key]}
            />
          </dd>
        </div>
      ))}
    </dl>
  );
};
