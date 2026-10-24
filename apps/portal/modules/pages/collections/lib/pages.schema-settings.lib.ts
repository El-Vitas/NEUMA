import type { PagesSchemaSettingsNames, PagesSchemaSettingsRoute } from '../types/pages.schema-settings.types';

/** A route can point at something that no longer exists; an option falls back to its property, the rest to root. */
export const readSettingsLevel = (
  route: PagesSchemaSettingsRoute,
  found: { readonly option: boolean; readonly property: boolean; readonly view: boolean },
): PagesSchemaSettingsRoute['level'] => {
  if (route.level === 'VIEW' && !found.view) return 'ROOT';
  if ((route.level === 'PROPERTY' || route.level === 'OPTION') && !found.property) return 'ROOT';
  if (route.level === 'OPTION' && !found.option) return 'PROPERTY';
  return route.level;
};

export const readSettingsTitle = (
  level: PagesSchemaSettingsRoute['level'],
  named: PagesSchemaSettingsNames,
): string => {
  switch (level) {
    case 'PROPERTIES':
      return named.properties;
    case 'PROPERTY':
      return named.property ?? named.properties;
    case 'OPTION':
      return named.option ?? named.options;
    case 'VIEW':
      return named.view ?? named.views;
    default:
      return named.configure;
  }
};

/** The first thing that keeps the shape from being saved, said in words; null when nothing does. */
export const readWhatIsMissing = (...reasons: readonly (string | null)[]): string | null =>
  reasons.find((reason) => reason !== null) ?? null;

export const readSettingsStepBack = (route: PagesSchemaSettingsRoute): PagesSchemaSettingsRoute => {
  if (route.level === 'OPTION') return { level: 'PROPERTY', propertyKey: route.propertyKey };
  if (route.level === 'PROPERTY') return { level: 'PROPERTIES' };
  return { level: 'ROOT' };
};
