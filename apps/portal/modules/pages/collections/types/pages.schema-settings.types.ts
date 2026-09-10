/** Una clase que se puede elegir al agregar algo: lo que se guarda y lo que se lee. */
export interface PagesSchemaSettingsKindOption {
  readonly label: string;
  readonly value: string;
}

/**
 * Dónde está parado quien configura la colección.
 *
 * La configuración no se muestra entera de una vez: se entra por niveles, y
 * cada nivel enseña una sola cosa. Un esquema con seis propiedades, cada una
 * con sus opciones y sus colores, desplegado a la vez es un muro donde no se
 * encuentra nada.
 */
export type PagesSchemaSettingsRoute =
  | { readonly level: 'OPTION'; readonly optionValue: string; readonly propertyKey: string }
  | { readonly level: 'PROPERTIES' }
  | { readonly level: 'PROPERTY'; readonly propertyKey: string }
  | { readonly level: 'ROOT' }
  /**
   * Por su lugar y no por su nombre: una vista se renombra desde aquí dentro, y
   * una ruta que la nombrara se quedaría apuntando a un nombre que acaba de
   * dejar de existir en cuanto se escribe la primera letra.
   */
  | { readonly level: 'VIEW'; readonly viewPosition: number };
