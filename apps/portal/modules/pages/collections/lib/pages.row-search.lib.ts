import { getPagePropertyLogicalType, PAGE_PROPERTY_LOGICAL_TYPE } from '@company-brain/shared';
import { foldPageLookingText } from '../../links/lib/pages.looking.lib';
import type { PageRow, PageSchemaProperty } from '../types/pages.schema.types';

/**
 * Todo lo que una fila dice de sí misma en palabras, junto y listo para buscar.
 *
 * Su nombre y lo que respondió donde se responde escribiendo. No se busca en un
 * número ni en una fecha: quien escribe «agosto» no está buscando `2026-08-14`,
 * y quien escribe «3» encontraría media colección.
 *
 * Se arma donde se dibuja la fila y viaja hecho, porque buscar ocurre al
 * teclear: rehacerlo por fila y por letra sería rehacer la colección entera en
 * cada tecla.
 */
export const buildRowSearchText = (row: PageRow, properties: readonly PageSchemaProperty[]): string => {
  const answered = properties
    .filter((property) => getPagePropertyLogicalType(property.type) === PAGE_PROPERTY_LOGICAL_TYPE.TEXT)
    .map((property) => row.propertyValues?.[property.key])
    .filter((value): value is string => typeof value === 'string');
  return foldPageLookingText([row.title, ...answered].join(' '));
};

/**
 * Si una fila cae dentro de lo buscado.
 *
 * Buscar sin escribir nada las deja pasar a todas: un buscador vacío no es una
 * condición, es un buscador esperando.
 */
export const rowMatchesQuery = (searchText: string, query: string): boolean => {
  const wanted = foldPageLookingText(query).trim();
  return wanted === '' || searchText.includes(wanted);
};
