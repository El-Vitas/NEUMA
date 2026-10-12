/** Falls back to the generic level name when the item being viewed is gone, e.g. a just-removed property. */
export interface PagesSchemaSettingsNames {
  readonly configure: string;
  readonly option: string | undefined;
  readonly options: string;
  readonly properties: string;
  readonly property: string | undefined;
  readonly view: string | undefined;
  readonly views: string;
}

export interface PagesSchemaSettingsKindOption {
  readonly label: string;
  readonly value: string;
}

export type PagesSchemaSettingsRoute =
  | { readonly level: 'OPTION'; readonly optionValue: string; readonly propertyKey: string }
  | { readonly level: 'PROPERTIES' }
  | { readonly level: 'PROPERTY'; readonly propertyKey: string }
  | { readonly level: 'ROOT' }
  /** By position, not name: a view is renamed from inside this route, which would orphan a name-based one. */
  | { readonly level: 'VIEW'; readonly viewPosition: number };
