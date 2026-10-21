import { readPageViewConfiguration, readVisiblePropertyKeys } from '@neuma/shared';
import type { PageSchemaProperty, PageSchemaViewDraft } from '../types/pages.schema.types';

/** Until the view chooses, the grouping property is hidden (the column header already shows it); a manual pick wins. */
export const readShownCardProperties = (
  view: PageSchemaViewDraft,
  properties: readonly PageSchemaProperty[],
): readonly PageSchemaProperty[] => {
  const { groupBy, visibleProperties } = readPageViewConfiguration(view.configuration);
  const shown = readShownProperties(view, properties);
  if (visibleProperties !== null) return shown;
  return shown.filter((property) => property.key !== groupBy);
};

/** In the view's own order, not the collection's. */
export const readShownProperties = (
  view: PageSchemaViewDraft,
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
