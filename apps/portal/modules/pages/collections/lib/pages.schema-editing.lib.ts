import type {
  PageOptionColor,
  PagePropertyOption,
  PagePropertyType,
  PageViewConfiguration,
  PageViewType,
} from '@neuma/shared';
import {
  buildPagePropertyKey,
  canPagePropertyGroupBoard,
  isTitlePageProperty,
  PAGE_PROPERTY_TYPE,
  PAGE_VIEW_TYPE,
  pagePropertyRequiresOptions,
  pageViewRequiresGrouping,
  pageViewSupportsGrouping,
  pickPageOptionColor,
  readPageViewConfiguration,
} from '@neuma/shared';
import { PAGE_ADDABLE_PROPERTY_TYPES } from '../constants/pages.schema-editing.constants';
import type { PageSchemaProperty, PageSchemaView } from '../types/pages.schema.types';

/**
 * The collection shape is sent whole, views included. Re-sending a configuration verbatim would fail when it
 * holds something the server no longer accepts, taking an unrelated property change down with it.
 */
export const toSavableView = (view: PageSchemaView): PageSchemaView => ({
  ...view,
  configuration: { ...readPageViewConfiguration(view.configuration) },
});

/**
 * A board without a grouping draws nothing and the server rejects the whole collection, so a new board
 * starts grouped by the first suitable property. A calendar starts on the first date property.
 */
const describeANewView = (
  type: PageViewType,
  properties: readonly PageSchemaProperty[],
): PageSchemaView['configuration'] => {
  if (type === PAGE_VIEW_TYPE.CALENDAR) {
    const dateProperty = properties.find((property) => property.type === PAGE_PROPERTY_TYPE.DATE)?.key;
    return dateProperty === undefined ? {} : { dateProperty };
  }
  if (!pageViewRequiresGrouping(type)) return {};
  const groupBy = properties.find((property) => canPagePropertyGroupBoard(property.type))?.key;
  return groupBy === undefined ? {} : { groupBy };
};

/** Never becomes the default. The name is the view's address, so names must be unique after trimming. */
export const addSchemaView = (
  views: readonly PageSchemaView[],
  added: { readonly name: string; readonly type: PageViewType },
  properties: readonly PageSchemaProperty[],
): readonly PageSchemaView[] => {
  const named = added.name.trim();
  if (named === '' || views.some((view) => view.name === named)) return views;
  return [
    ...views,
    { configuration: describeANewView(added.type, properties), isDefault: false, name: named, type: added.type },
  ];
};

/** "Name (2)", or the next free number. */
const nameTheCopyOf = (name: string, views: readonly PageSchemaView[]): string => {
  const taken = new Set(views.map((view) => view.name));
  let attempt = 2;
  while (taken.has(`${name} (${attempt})`)) attempt += 1;
  return `${name} (${attempt})`;
};

/** The copy sits right after the original and is never the default. */
export const duplicateSchemaView = (views: readonly PageSchemaView[], name: string): readonly PageSchemaView[] => {
  const from = views.findIndex((view) => view.name === name);
  const original = views[from];
  if (original === undefined) return views;
  const copy: PageSchemaView = {
    configuration: { ...original.configuration },
    isDefault: false,
    name: nameTheCopyOf(name, views),
    type: original.type,
  };
  return [...views.slice(0, from + 1), copy, ...views.slice(from + 1)];
};

/** Only what the new type cannot draw; merely unused settings stay so converting back is lossless. */
export const listWhatConvertingDrops = (view: PageSchemaView, type: PageViewType): readonly string[] => {
  const configuration = readPageViewConfiguration(view.configuration);
  const dropped: string[] = [];
  if (configuration.subGroupBy !== null && type !== PAGE_VIEW_TYPE.BOARD) dropped.push('BANDS');
  if (configuration.groupBy !== null && !pageViewSupportsGrouping(type)) dropped.push('GROUPING');
  return dropped;
};

const regroupForConversion = (
  configuration: PageViewConfiguration,
  type: PageViewType,
  properties: readonly PageSchemaProperty[],
  dropped: readonly string[],
): { readonly groupBy?: null | string } => {
  if (dropped.includes('GROUPING')) return { groupBy: null };
  if (configuration.groupBy !== null) return {};
  return describeANewView(type, properties);
};

/** Fills in what the new type requires (a board's grouping): an undrawable view would fail the whole save. */
export const convertSchemaView = (
  views: readonly PageSchemaView[],
  name: string,
  type: PageViewType,
  properties: readonly PageSchemaProperty[],
): readonly PageSchemaView[] =>
  views.map((view) => {
    if (view.name !== name || view.type === type) return view;
    const configuration = readPageViewConfiguration(view.configuration);
    const dropped = listWhatConvertingDrops(view, type);
    return {
      ...view,
      configuration: {
        ...configuration,
        ...regroupForConversion(configuration, type, properties, dropped),
        ...(dropped.includes('BANDS') ? { subGroupBy: null } : {}),
      },
      type,
    };
  });

/** Links using the old name fall back to the default view, which is better than an empty screen. */
export const renameSchemaView = (
  views: readonly PageSchemaView[],
  name: string,
  renamedTo: string,
): readonly PageSchemaView[] => {
  const named = renamedTo.trim();
  if (named === '' || views.some((view) => view.name === named)) return views;
  return views.map((view) => (view.name === name ? { ...view, name: named } : view));
};

/** Tab order only; which view opens by default is set separately. */
export const moveSchemaView = (
  views: readonly PageSchemaView[],
  name: string,
  direction: 'EARLIER' | 'LATER',
): readonly PageSchemaView[] => {
  const from = views.findIndex((view) => view.name === name);
  const to = direction === 'EARLIER' ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= views.length) return views;
  const moved = [...views];
  const [taken] = moved.splice(from, 1);
  if (taken === undefined) return views;
  moved.splice(to, 0, taken);
  return moved;
};

export const addSchemaProperty = (
  properties: readonly PageSchemaProperty[],
  added: { readonly label: string; readonly type: PagePropertyType },
): readonly PageSchemaProperty[] => [
  ...properties,
  {
    key: buildPagePropertyKey(added.label, properties),
    label: added.label,
    options: pagePropertyRequiresOptions(added.type) ? [] : null,
    required: false,
    type: added.type,
  },
];

/**
 * This is the collection-wide order, used by every view that has not chosen its own. The title property
 * always stays first, so it neither moves nor gets displaced.
 */
export const moveSchemaProperty = (
  properties: readonly PageSchemaProperty[],
  key: string,
  direction: 'EARLIER' | 'LATER',
): readonly PageSchemaProperty[] => {
  const from = properties.findIndex((property) => property.key === key);
  const to = direction === 'EARLIER' ? from - 1 : from + 1;
  const taken = properties[from];
  const displaced = properties[to];
  if (taken === undefined || displaced === undefined) return properties;
  if (isTitlePageProperty(taken.type) || isTitlePageProperty(displaced.type)) return properties;
  const moved = [...properties];
  moved.splice(from, 1);
  moved.splice(to, 0, taken);
  return moved;
};

/** The title property cannot be removed: the server requires exactly one. */
export const removeSchemaProperty = (
  properties: readonly PageSchemaProperty[],
  key: string,
): readonly PageSchemaProperty[] => {
  const target = properties.find((property) => property.key === key);
  if (target === undefined || isTitlePageProperty(target.type)) return properties;
  return properties.filter((property) => property.key !== key);
};

/** Narrows a select's plain string by lookup instead of a cast. */
export const readAddablePropertyType = (chosen: string): PagePropertyType | undefined =>
  PAGE_ADDABLE_PROPERTY_TYPES.find((candidate) => candidate === chosen);

/** Options survive between list types, are dropped for non-list types, and start empty when newly required. */
const carryOptionsInto = (
  property: PageSchemaProperty,
  type: PagePropertyType,
): readonly PagePropertyOption[] | null => {
  if (!pagePropertyRequiresOptions(type)) return null;
  return property.options ?? [];
};

/**
 * The key is kept: rows store their values under it. Values already stored are not rewritten (that would
 * take a request per row). The title cannot change type, nor can another property become it.
 */
export const changeSchemaPropertyType = (
  properties: readonly PageSchemaProperty[],
  key: string,
  type: PagePropertyType,
): readonly PageSchemaProperty[] => {
  if (isTitlePageProperty(type)) return properties;
  const target = properties.find((property) => property.key === key);
  if (target === undefined || isTitlePageProperty(target.type)) return properties;
  return properties.map((property) =>
    property.key === key ? { ...property, options: carryOptionsInto(property, type), type } : property,
  );
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

/** Checked before sending so the message can name the clash instead of a generic server error. */
export const isSchemaOptionNameTaken = (
  properties: readonly PageSchemaProperty[],
  key: string,
  name: string,
): boolean => {
  const named = name.trim();
  const options = properties.find((property) => property.key === key)?.options ?? [];
  return options.some((option) => option.value === named);
};

/** Each new option gets a distinct color so board columns are told apart. */
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

/** Rows already stored keep the old name: rewriting them would take a request per row. */
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

const placeOptionAt = (
  options: readonly PagePropertyOption[],
  value: string,
  at: number,
): readonly PagePropertyOption[] | null => {
  const taken = options.find((option) => option.value === value);
  if (taken === undefined || at === -1) return null;
  const rest = options.filter((option) => option.value !== value);
  return [...rest.slice(0, at), taken, ...rest.slice(at)];
};

/** Positioned by the option it goes before, since a drop targets a gap; null means the end. */
export const moveSchemaOption = (
  properties: readonly PageSchemaProperty[],
  key: string,
  value: string,
  beforeValue: null | string,
): readonly PageSchemaProperty[] =>
  withOptions(properties, key, (options) => {
    if (value === beforeValue) return null;
    const rest = options.filter((option) => option.value !== value);
    const at = beforeValue === null ? rest.length : rest.findIndex((option) => option.value === beforeValue);
    return placeOptionAt(options, value, at);
  });

export const moveSchemaOptionSideways = (
  properties: readonly PageSchemaProperty[],
  key: string,
  value: string,
  direction: 'EARLIER' | 'LATER',
): readonly PageSchemaProperty[] =>
  withOptions(properties, key, (options) => {
    const from = options.findIndex((option) => option.value === value);
    const at = direction === 'EARLIER' ? from - 1 : from + 1;
    if (from === -1 || at < 0 || at >= options.length) return null;
    return placeOptionAt(options, value, at);
  });

export const removeSchemaOption = (
  properties: readonly PageSchemaProperty[],
  key: string,
  value: string,
): readonly PageSchemaProperty[] =>
  withOptions(properties, key, (options) => options.filter((option) => option.value !== value));
