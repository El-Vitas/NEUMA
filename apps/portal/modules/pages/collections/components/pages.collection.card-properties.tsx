'use client';

import { cn } from '@/lib/utils';
import { EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import { hasPropertyValueToShow } from '../lib/pages.properties.lib';
import type { PagePersonOption, PageRow, PageSchemaProperty } from '../types/pages.schema.types';
import { PagesPropertyValue } from './pages.properties.value';

interface IProps {
  /**
   * En columna cuando hay poco ancho y mucho alto —una tarjeta—, y en línea
   * cuando es al revés: un renglón de una lista tiene el ancho de la página
   * entera, y apilar ahí seis propiedades convierte cada fila en un párrafo.
   */
  readonly direction: 'COLUMN' | 'ROW';
  readonly personOptions?: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly row: PageRow;
}

/**
 * Lo que una fila dice además de su título.
 *
 * Solo se dibuja lo que lleva algo: el sitio es poco, y una hilera de etiquetas
 * vacías ocupa el de las que sí respondieron.
 */
export const PagesCollectionCardProperties = ({
  direction,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  properties,
  row,
}: IProps) => {
  const answered = properties.filter((property) => hasPropertyValueToShow(row.propertyValues?.[property.key]));
  if (answered.length === 0) return null;

  return (
    <dl
      className={cn(
        'm-0 flex text-muted-foreground text-xs',
        direction === 'ROW' ? 'flex-wrap items-center gap-x-3 gap-y-1' : 'flex-col gap-1',
      )}
    >
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
