import type { PagesSchemaSettingsNames, PagesSchemaSettingsRoute } from '../types/pages.schema-settings.types';

/**
 * Dónde se está de verdad.
 *
 * Una ruta puede quedar señalando algo que ya no está —una vista que no se
 * llegó a agregar, una propiedad recién quitada— y dibujar ese nivel sería una
 * pantalla en blanco con un título y nada debajo. Quien entró a una opción cae
 * en su propiedad, y el resto vuelve al principio, que es donde se puede hacer
 * algo otra vez.
 */
export const readSettingsLevel = (
  route: PagesSchemaSettingsRoute,
  found: { readonly option: boolean; readonly property: boolean; readonly view: boolean },
): PagesSchemaSettingsRoute['level'] => {
  if (route.level === 'VIEW' && !found.view) return 'ROOT';
  if ((route.level === 'PROPERTY' || route.level === 'OPTION') && !found.property) return 'ROOT';
  if (route.level === 'OPTION' && !found.option) return 'PROPERTY';
  return route.level;
};

/**
 * Cómo se llama el nivel que se está mirando.
 *
 * Por lo que se está mirando —el nombre de la propiedad, el de la vista— y por
 * el nombre general del nivel cuando eso ya no está: un título en blanco no
 * dice dónde se está parado.
 */
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

/**
 * Un paso atrás, no hasta el principio: quien entró a una opción vuelve a su
 * propiedad, y quien entró a una propiedad vuelve a la lista de propiedades.
 */
export const readSettingsStepBack = (route: PagesSchemaSettingsRoute): PagesSchemaSettingsRoute => {
  if (route.level === 'OPTION') return { level: 'PROPERTY', propertyKey: route.propertyKey };
  if (route.level === 'PROPERTY') return { level: 'PROPERTIES' };
  return { level: 'ROOT' };
};
