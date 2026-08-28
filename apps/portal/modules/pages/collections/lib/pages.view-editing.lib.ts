import { canPagePropertyGroupBoard, readPageViewConfiguration, readVisiblePropertyKeys } from '@company-brain/shared';
import type { PageSchemaProperty, PageSchemaView } from '../types/pages.schema.types';

/**
 * The properties a board can make columns from.
 *
 * Only a property with a closed list of values: grouping by a date would make a
 * column per day, and grouping by free text a column per answer.
 */
export const listGroupablePropertyKeys = (properties: readonly PageSchemaProperty[]): readonly string[] =>
  properties.filter((property) => canPagePropertyGroupBoard(property.type)).map((property) => property.key);

const rewriteView = (
  views: readonly PageSchemaView[],
  viewName: string,
  rewrite: (configuration: PageSchemaView['configuration']) => PageSchemaView['configuration'],
): readonly PageSchemaView[] =>
  views.map((view) => (view.name === viewName ? { ...view, configuration: rewrite(view.configuration) } : view));

export const setViewGroupBy = (
  views: readonly PageSchemaView[],
  viewName: string,
  groupBy: string,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => ({ ...readPageViewConfiguration(configuration), groupBy }));

/**
 * Shows or hides one property in one view.
 *
 * A view that never chose is showing everything, so the first click has to write
 * down everything except what was clicked — otherwise hiding one property would
 * read as «show only this one».
 */
export const toggleViewProperty = (
  views: readonly PageSchemaView[],
  viewName: string,
  propertyKey: string,
  availableKeys: readonly string[],
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => {
    const current = readPageViewConfiguration(configuration);
    const shown = readVisiblePropertyKeys(current.visibleProperties, availableKeys);
    const visibleProperties = shown.includes(propertyKey)
      ? shown.filter((key) => key !== propertyKey)
      : [...shown, propertyKey];
    return { ...current, visibleProperties: [...visibleProperties] };
  });
