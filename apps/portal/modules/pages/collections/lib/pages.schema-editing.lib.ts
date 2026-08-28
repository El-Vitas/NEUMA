import type { PageOptionColor, PagePropertyOption, PagePropertyType } from '@company-brain/shared';
import {
  isTitlePageProperty,
  pagePropertyRequiresOptions,
  pickPageOptionColor,
  readPageViewConfiguration,
} from '@company-brain/shared';
import {
  PAGE_PROPERTY_KEY_COMBINING_MARKS,
  PAGE_PROPERTY_KEY_DIGIT_PREFIX,
  PAGE_PROPERTY_KEY_EDGE_UNDERSCORES,
  PAGE_PROPERTY_KEY_FALLBACK,
  PAGE_PROPERTY_KEY_MAX_LENGTH,
  PAGE_PROPERTY_KEY_RUNS_OF_ANYTHING_ELSE,
  PAGE_PROPERTY_KEY_STARTS_WITH_DIGIT,
} from '../constants/pages.schema-editing.constants';
import type { PageSchemaProperty, PageSchemaView } from '../types/pages.schema.types';

const toBareKey = (label: string): string => {
  const plain = label
    .normalize('NFD')
    .replace(PAGE_PROPERTY_KEY_COMBINING_MARKS, '')
    .toLowerCase()
    .replace(PAGE_PROPERTY_KEY_RUNS_OF_ANYTHING_ELSE, '_')
    .replace(PAGE_PROPERTY_KEY_EDGE_UNDERSCORES, '')
    .slice(0, PAGE_PROPERTY_KEY_MAX_LENGTH);
  if (plain === '') return PAGE_PROPERTY_KEY_FALLBACK;
  return PAGE_PROPERTY_KEY_STARTS_WITH_DIGIT.test(plain) ? `${PAGE_PROPERTY_KEY_DIGIT_PREFIX}${plain}` : plain;
};

/**
 * The key a property is stored under, made from the name somebody typed.
 *
 * The key never changes once a row has written something under it, so it is
 * built to survive: no accents, no spaces, nothing the server would refuse. A
 * name already taken gets a number rather than landing on somebody else's
 * values.
 */
export const buildPropertyKey = (label: string, properties: readonly PageSchemaProperty[]): string => {
  const bare = toBareKey(label);
  const taken = new Set(properties.map((property) => property.key));
  if (!taken.has(bare)) return bare;
  let attempt = 2;
  while (taken.has(`${bare}_${String(attempt)}`)) attempt += 1;
  return `${bare}_${String(attempt)}`;
};

/**
 * A view as it can be sent back, keeping only what its configuration is allowed
 * to hold.
 *
 * The shape of a collection travels whole, views included, even when only a
 * property changed. Sending a configuration back exactly as it arrived would
 * fail on any collection whose views were written with something the server no
 * longer accepts, and the property nobody touched would take the change down
 * with it.
 */
export const toSavableView = (view: PageSchemaView): PageSchemaView => ({
  ...view,
  configuration: { ...readPageViewConfiguration(view.configuration) },
});

export const addSchemaProperty = (
  properties: readonly PageSchemaProperty[],
  added: { readonly label: string; readonly type: PagePropertyType },
): readonly PageSchemaProperty[] => [
  ...properties,
  {
    key: buildPropertyKey(added.label, properties),
    label: added.label,
    options: pagePropertyRequiresOptions(added.type) ? [] : null,
    required: false,
    type: added.type,
  },
];

/**
 * Removes a property, unless it is the one that names each row.
 *
 * A collection without a title has no way to open its rows, and the server
 * refuses a shape without exactly one. Refusing here says so before the trip.
 */
export const removeSchemaProperty = (
  properties: readonly PageSchemaProperty[],
  key: string,
): readonly PageSchemaProperty[] => {
  const target = properties.find((property) => property.key === key);
  if (target === undefined || isTitlePageProperty(target.type)) return properties;
  return properties.filter((property) => property.key !== key);
};

export const updateSchemaProperty = (
  properties: readonly PageSchemaProperty[],
  key: string,
  changes: Partial<Pick<PageSchemaProperty, 'label' | 'required'>>,
): readonly PageSchemaProperty[] =>
  properties.map((property) => (property.key === key ? { ...property, ...changes } : property));

const withOptions = (
  properties: readonly PageSchemaProperty[],
  key: string,
  rewrite: (options: readonly PagePropertyOption[]) => readonly PagePropertyOption[] | null,
): readonly PageSchemaProperty[] =>
  properties.map((property) => {
    if (property.key !== key || property.options === null) return property;
    const rewritten = rewrite(property.options);
    return rewritten === null ? property : { ...property, options: rewritten };
  });

/** Adds a choice, with a color of its own so a board tells one column from the next. */
export const addSchemaOption = (
  properties: readonly PageSchemaProperty[],
  key: string,
  value: string,
): readonly PageSchemaProperty[] =>
  withOptions(properties, key, (options) => {
    const named = value.trim();
    if (named === '' || options.some((option) => option.value === named)) return null;
    return [...options, { color: pickPageOptionColor(options.length), value: named }];
  });

/**
 * Renames a choice in the shape.
 *
 * What the rows already stored keeps the old name: the value lives on each row,
 * and reaching every row from here would take a trip per row. Whoever renames is
 * told what it costs before doing it.
 */
export const renameSchemaOption = (
  properties: readonly PageSchemaProperty[],
  key: string,
  value: string,
  renamedTo: string,
): readonly PageSchemaProperty[] =>
  withOptions(properties, key, (options) => {
    const named = renamedTo.trim();
    if (named === '' || options.some((option) => option.value === named)) return null;
    return options.map((option) => (option.value === value ? { ...option, value: named } : option));
  });

export const updateSchemaOptionColor = (
  properties: readonly PageSchemaProperty[],
  key: string,
  value: string,
  color: PageOptionColor | null,
): readonly PageSchemaProperty[] =>
  withOptions(properties, key, (options) =>
    options.map((option) => (option.value === value ? { ...option, color } : option)),
  );

export const removeSchemaOption = (
  properties: readonly PageSchemaProperty[],
  key: string,
  value: string,
): readonly PageSchemaProperty[] =>
  withOptions(properties, key, (options) => options.filter((option) => option.value !== value));
