import { readPageViewConfiguration, readVisiblePropertyKeys } from '@company-brain/shared';
import type { PageSchemaProperty, PageSchemaView } from '../types/pages.schema.types';

/**
 * The properties one view shows, in the order it shows them.
 *
 * The order is the view's, not the collection's: somebody who put the due date
 * first meant to read it first, and reordering it back would undo the choice.
 */
/**
 * Lo que una tarjeta dice además de su título.
 *
 * Mientras la vista no eligió nada, la propiedad por la que agrupa se queda
 * fuera: el encabezado de la columna ya dice ese valor y repetirlo en cada
 * tarjeta de dentro es ruido donde menos espacio hay. Pero si alguien la marcó
 * a mano, se muestra: eligió verla y sacársela igual sería no hacerle caso.
 */
export const readShownCardProperties = (
  view: PageSchemaView,
  properties: readonly PageSchemaProperty[],
): readonly PageSchemaProperty[] => {
  const { groupBy, visibleProperties } = readPageViewConfiguration(view.configuration);
  const shown = readShownProperties(view, properties);
  if (visibleProperties !== null) return shown;
  return shown.filter((property) => property.key !== groupBy);
};

export const readShownProperties = (
  view: PageSchemaView,
  properties: readonly PageSchemaProperty[],
): readonly PageSchemaProperty[] => {
  const chosen = readVisiblePropertyKeys(
    readPageViewConfiguration(view.configuration).visibleProperties,
    properties.map((property) => property.key),
  );
  const byKey = new Map(properties.map((property) => [property.key, property]));
  return chosen.flatMap((key) => {
    const property = byKey.get(key);
    return property === undefined ? [] : [property];
  });
};
