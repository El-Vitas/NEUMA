import type {
  PageOptionColor,
  PagePropertyConfig,
  PagePropertyOption,
  PagePropertyType,
  PageStatusGroup,
  PageViewConfiguration,
  PageViewType,
} from '@neuma/shared';
import {
  buildPagePropertyKey,
  canPagePropertyGroupBoard,
  createDefaultStatusOptions,
  DEFAULT_PAGE_PROPERTY_CONFIG,
  isTitlePageProperty,
  PAGE_PROPERTY_TYPE,
  PAGE_STATUS_GROUP,
  PAGE_VIEW_TYPE,
  pagePropertyRequiresOptions,
  pageViewRequiresGrouping,
  pageViewSupportsGrouping,
  pickPageOptionColor,
  readPageViewConfiguration,
} from '@neuma/shared';
import {
  DRAFT_OPTION_ID_LENGTH,
  PAGE_ADDABLE_PROPERTY_TYPES,
  PAGE_TYPE_CHANGE_LOCKED_TYPES,
} from '../constants/pages.schema-editing.constants';
import type { PageSchemaProperty, PageSchemaViewDraft } from '../types/pages.schema.types';

/**
 * The collection shape is sent whole, views included. Re-sending a configuration verbatim would fail when it
 * holds something the server no longer accepts, taking an unrelated property change down with it.
 */
export const toSavableView = (view: PageSchemaViewDraft): PageSchemaViewDraft => ({
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
): PageSchemaViewDraft['configuration'] => {
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
  views: readonly PageSchemaViewDraft[],
  added: { readonly name: string; readonly type: PageViewType },
  properties: readonly PageSchemaProperty[],
): readonly PageSchemaViewDraft[] => {
  const named = added.name.trim();
  if (named === '' || views.some((view) => view.name === named)) return views;
  return [
    ...views,
    { configuration: describeANewView(added.type, properties), isDefault: false, name: named, type: added.type },
  ];
};

/** "Name (2)", or the next free number. */
const nameTheCopyOf = (name: string, views: readonly PageSchemaViewDraft[]): string => {
  const taken = new Set(views.map((view) => view.name));
  let attempt = 2;
  while (taken.has(`${name} (${attempt})`)) attempt += 1;
  return `${name} (${attempt})`;
};

/** The copy sits right after the original and is never the default. */
export const duplicateSchemaView = (
  views: readonly PageSchemaViewDraft[],
  name: string,
): readonly PageSchemaViewDraft[] => {
  const from = views.findIndex((view) => view.name === name);
  const original = views[from];
  if (original === undefined) return views;
  const copy: PageSchemaViewDraft = {
    configuration: { ...original.configuration },
    isDefault: false,
    name: nameTheCopyOf(name, views),
    type: original.type,
  };
  return [...views.slice(0, from + 1), copy, ...views.slice(from + 1)];
};

/** Only what the new type cannot draw; merely unused settings stay so converting back is lossless. */
export const listWhatConvertingDrops = (view: PageSchemaViewDraft, type: PageViewType): readonly string[] => {
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
  views: readonly PageSchemaViewDraft[],
  name: string,
  type: PageViewType,
  properties: readonly PageSchemaProperty[],
): readonly PageSchemaViewDraft[] =>
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
  views: readonly PageSchemaViewDraft[],
  name: string,
  renamedTo: string,
): readonly PageSchemaViewDraft[] => {
  const named = renamedTo.trim();
  if (named === '' || views.some((view) => view.name === named)) return views;
  return views.map((view) => (view.name === name ? { ...view, name: named } : view));
};

/** Tab order only; which view opens by default is set separately. */
export const moveSchemaView = (
  views: readonly PageSchemaViewDraft[],
  name: string,
  direction: 'EARLIER' | 'LATER',
): readonly PageSchemaViewDraft[] => {
  const from = views.findIndex((view) => view.name === name);
  const to = direction === 'EARLIER' ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= views.length) return views;
  const moved = [...views];
  const [taken] = moved.splice(from, 1);
  if (taken === undefined) return views;
  moved.splice(to, 0, taken);
  return moved;
};

/**
 * An option the server has not seen yet. It only needs to differ from the others: the server gives it its own id
 * on saving, and nothing can refer to this one before then.
 */
export const createDraftOptionId = (): string => `draft-${crypto.randomUUID().slice(0, DRAFT_OPTION_ID_LENGTH)}`;

const startOptionsFor = (type: PagePropertyType): readonly PagePropertyOption[] | null => {
  if (type === PAGE_PROPERTY_TYPE.STATUS) return createDefaultStatusOptions(createDraftOptionId);
  return pagePropertyRequiresOptions(type) ? [] : null;
};

/** `twoWay` only means something for a relation that is new: the other collection gets the way back. */
export const addSchemaProperty = (
  properties: readonly PageSchemaProperty[],
  added: {
    readonly config?: Partial<PagePropertyConfig>;
    readonly label: string;
    readonly twoWay?: boolean;
    readonly type: PagePropertyType;
  },
): readonly PageSchemaProperty[] => [
  ...properties,
  {
    config: { ...DEFAULT_PAGE_PROPERTY_CONFIG, ...added.config },
    key: buildPagePropertyKey(added.label, properties),
    label: added.label,
    options: startOptionsFor(added.type),
    required: false,
    ...(added.type === PAGE_PROPERTY_TYPE.RELATION ? { twoWay: added.twoWay === true } : {}),
    type: added.type,
  },
];

/** A relation that is new carries the flag from the moment it is added; one that was saved never has it. */
export const isSchemaRelationNew = (property: PageSchemaProperty): boolean =>
  property.type === PAGE_PROPERTY_TYPE.RELATION && property.twoWay !== undefined;

export const setSchemaRelationTwoWay = (
  properties: readonly PageSchemaProperty[],
  key: string,
  isTwoWay: boolean,
): readonly PageSchemaProperty[] =>
  properties.map((property) =>
    property.key === key && isSchemaRelationNew(property) ? { ...property, twoWay: isTwoWay } : property,
  );

/** A relation without its collection cannot be saved: the server would have nowhere to point it. */
export const findRelationWithoutTarget = (properties: readonly PageSchemaProperty[]): PageSchemaProperty | undefined =>
  properties.find(
    (property) => property.type === PAGE_PROPERTY_TYPE.RELATION && property.config.targetCollectionId === null,
  );

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

/** A property holding ids of other things, or one the server fills, keeps its type: stored values would not fit. */
const isTypeChangeLocked = (type: PagePropertyType): boolean => PAGE_TYPE_CHANGE_LOCKED_TYPES.includes(type);

export const canSchemaPropertyChangeType = (from: PagePropertyType, to: PagePropertyType): boolean =>
  from !== to &&
  !isTitlePageProperty(from) &&
  !isTitlePageProperty(to) &&
  !isTypeChangeLocked(from) &&
  !isTypeChangeLocked(to);

/**
 * The key is kept: rows store their values under it. Values already stored are not rewritten (that would
 * take a request per row). The title cannot change type, nor can another property become it.
 */
export const changeSchemaPropertyType = (
  properties: readonly PageSchemaProperty[],
  key: string,
  type: PagePropertyType,
): readonly PageSchemaProperty[] => {
  const target = properties.find((property) => property.key === key);
  if (target === undefined || !canSchemaPropertyChangeType(target.type, type)) return properties;
  return properties.map((property) =>
    property.key === key
      ? { ...property, config: DEFAULT_PAGE_PROPERTY_CONFIG, options: carryOptionsInto(property, type), type }
      : property,
  );
};

export const updateSchemaProperty = (
  properties: readonly PageSchemaProperty[],
  key: string,
  changes: Partial<Pick<PageSchemaProperty, 'label' | 'required'>>,
): readonly PageSchemaProperty[] =>
  properties.map((property) => (property.key === key ? { ...property, ...changes } : property));

/** Only the fields the type uses are kept on saving, so a stray field here does no harm. */
export const updateSchemaPropertyConfig = (
  properties: readonly PageSchemaProperty[],
  key: string,
  changes: Partial<PagePropertyConfig>,
): readonly PageSchemaProperty[] =>
  properties.map((property) =>
    property.key === key ? { ...property, config: { ...property.config, ...changes } } : property,
  );

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

/**
 * Each new option gets a distinct color so board columns are told apart. A status option sits in one of the three
 * groups; any other option has none.
 */
export const addSchemaOption = (
  properties: readonly PageSchemaProperty[],
  key: string,
  name: string,
  group: PageStatusGroup = PAGE_STATUS_GROUP.TO_DO,
): readonly PageSchemaProperty[] =>
  properties.map((property) => {
    if (property.key !== key || property.options === null) return property;
    const named = name.trim();
    if (named === '' || property.options.some((option) => option.value === named)) return property;
    const added: PagePropertyOption = {
      color: pickPageOptionColor(property.options.length),
      group: property.type === PAGE_PROPERTY_TYPE.STATUS ? group : null,
      id: createDraftOptionId(),
      value: named,
    };
    return { ...property, options: [...property.options, added] };
  });

/** The option keeps its id, so the rows that hold it follow the new name without being touched. */
export const renameSchemaOption = (
  properties: readonly PageSchemaProperty[],
  key: string,
  optionId: string,
  renamedTo: string,
): readonly PageSchemaProperty[] =>
  withOptions(properties, key, (options) => {
    const named = renamedTo.trim();
    if (named === '' || options.some((option) => option.value === named)) return null;
    return options.map((option) => (option.id === optionId ? { ...option, value: named } : option));
  });

export const updateSchemaOptionColor = (
  properties: readonly PageSchemaProperty[],
  key: string,
  optionId: string,
  color: PageOptionColor | null,
): readonly PageSchemaProperty[] =>
  withOptions(properties, key, (options) =>
    options.map((option) => (option.id === optionId ? { ...option, color } : option)),
  );

const placeOptionAt = (
  options: readonly PagePropertyOption[],
  optionId: string,
  at: number,
): readonly PagePropertyOption[] | null => {
  const taken = options.find((option) => option.id === optionId);
  if (taken === undefined || at === -1) return null;
  const rest = options.filter((option) => option.id !== optionId);
  return [...rest.slice(0, at), taken, ...rest.slice(at)];
};

/** Positioned by the option it goes before, since a drop targets a gap; null means the end. */
export const moveSchemaOption = (
  properties: readonly PageSchemaProperty[],
  key: string,
  optionId: string,
  beforeOptionId: null | string,
): readonly PageSchemaProperty[] =>
  withOptions(properties, key, (options) => {
    if (optionId === beforeOptionId) return null;
    const rest = options.filter((option) => option.id !== optionId);
    const at = beforeOptionId === null ? rest.length : rest.findIndex((option) => option.id === beforeOptionId);
    return placeOptionAt(options, optionId, at);
  });

export const moveSchemaOptionSideways = (
  properties: readonly PageSchemaProperty[],
  key: string,
  optionId: string,
  direction: 'EARLIER' | 'LATER',
): readonly PageSchemaProperty[] =>
  withOptions(properties, key, (options) => {
    const from = options.findIndex((option) => option.id === optionId);
    const at = direction === 'EARLIER' ? from - 1 : from + 1;
    if (from === -1 || at < 0 || at >= options.length) return null;
    return placeOptionAt(options, optionId, at);
  });

/** A status keeps an option in each group, since new rows start on one and the board needs a column per group. */
export const canSchemaOptionBeRemoved = (property: PageSchemaProperty, optionId: string): boolean => {
  if (property.type !== PAGE_PROPERTY_TYPE.STATUS) return true;
  const target = property.options?.find((option) => option.id === optionId);
  if (target === undefined) return false;
  return (property.options ?? []).some((option) => option.id !== optionId && option.group === target.group);
};

export const removeSchemaOption = (
  properties: readonly PageSchemaProperty[],
  key: string,
  optionId: string,
): readonly PageSchemaProperty[] =>
  properties.map((property) => {
    if (property.key !== key || property.options === null || !canSchemaOptionBeRemoved(property, optionId)) {
      return property;
    }
    return { ...property, options: property.options.filter((option) => option.id !== optionId) };
  });
