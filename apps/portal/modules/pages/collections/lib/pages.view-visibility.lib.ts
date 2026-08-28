import { readPageViewConfiguration, readVisiblePropertyKeys } from '@company-brain/shared';
import type { PageSchemaProperty, PageSchemaView } from '../types/pages.schema.types';

/**
 * The properties one view shows, in the order it shows them.
 *
 * The order is the view's, not the collection's: somebody who put the due date
 * first meant to read it first, and reordering it back would undo the choice.
 */
/**
 * What a card says besides its title, once the board is drawn.
 *
 * The property the board groups by is left out: the column heading already says
 * that value, and repeating it on every card inside is noise in the place where
 * space is scarcest.
 */
export const readShownCardProperties = (
  view: PageSchemaView,
  properties: readonly PageSchemaProperty[],
): readonly PageSchemaProperty[] => {
  const groupBy = readPageViewConfiguration(view.configuration).groupBy;
  return readShownProperties(view, properties).filter((property) => property.key !== groupBy);
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
