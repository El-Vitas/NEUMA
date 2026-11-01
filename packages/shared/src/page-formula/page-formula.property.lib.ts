import { readPageDateValue } from '../page-property/page-property.date.lib.js';
import { findPageOption } from '../page-property/page-property.option.lib.js';
import type { PagePropertyValue } from '../page-property/page-property.types.js';
import { PAGE_PROPERTY_TYPE } from '../types/page-schema.types.js';
import type { PagePropertyType } from '../types/page-schema.types.js';
import { PAGE_FORMULA_TYPE } from './page-formula.constants.js';
import type {
  PageComputedConfig,
  PageFormulaPropertyInfo,
  PageFormulaType,
  PageFormulaValue,
} from './page-formula.types.js';

const TYPE_BY_STORED_PROPERTY: Readonly<Partial<Record<PagePropertyType, PageFormulaType>>> = {
  [PAGE_PROPERTY_TYPE.TITLE]: PAGE_FORMULA_TYPE.TEXT,
  [PAGE_PROPERTY_TYPE.RICH_TEXT]: PAGE_FORMULA_TYPE.TEXT,
  [PAGE_PROPERTY_TYPE.URL]: PAGE_FORMULA_TYPE.TEXT,
  [PAGE_PROPERTY_TYPE.EMAIL]: PAGE_FORMULA_TYPE.TEXT,
  [PAGE_PROPERTY_TYPE.PHONE]: PAGE_FORMULA_TYPE.TEXT,
  [PAGE_PROPERTY_TYPE.SELECT]: PAGE_FORMULA_TYPE.TEXT,
  [PAGE_PROPERTY_TYPE.STATUS]: PAGE_FORMULA_TYPE.TEXT,
  [PAGE_PROPERTY_TYPE.CREATED_BY]: PAGE_FORMULA_TYPE.TEXT,
  [PAGE_PROPERTY_TYPE.EDITED_BY]: PAGE_FORMULA_TYPE.TEXT,
  [PAGE_PROPERTY_TYPE.NUMBER]: PAGE_FORMULA_TYPE.NUMBER,
  [PAGE_PROPERTY_TYPE.UNIQUE_ID]: PAGE_FORMULA_TYPE.NUMBER,
  [PAGE_PROPERTY_TYPE.CHECKBOX]: PAGE_FORMULA_TYPE.BOOLEAN,
  [PAGE_PROPERTY_TYPE.DATE]: PAGE_FORMULA_TYPE.DATE,
  [PAGE_PROPERTY_TYPE.CREATED_TIME]: PAGE_FORMULA_TYPE.DATE,
  [PAGE_PROPERTY_TYPE.EDITED_TIME]: PAGE_FORMULA_TYPE.DATE,
  [PAGE_PROPERTY_TYPE.MULTI_SELECT]: PAGE_FORMULA_TYPE.LIST,
  [PAGE_PROPERTY_TYPE.PERSON]: PAGE_FORMULA_TYPE.LIST,
  [PAGE_PROPERTY_TYPE.RELATION]: PAGE_FORMULA_TYPE.LIST,
  [PAGE_PROPERTY_TYPE.FILES]: PAGE_FORMULA_TYPE.LIST,
};

/** A property that is computed rather than stored: its value comes from the engine, not from the row. */
export const isPageComputedPropertyType = (type: PagePropertyType): boolean =>
  type === PAGE_PROPERTY_TYPE.FORMULA || type === PAGE_PROPERTY_TYPE.ROLLUP;

/** The type a formula sees when it reads the property; a computed one has the type of its result. */
export const readPageFormulaPropertyType = (property: PageFormulaPropertyInfo): PageFormulaType | null =>
  isPageComputedPropertyType(property.type) ? property.resultType : (TYPE_BY_STORED_PROPERTY[property.type] ?? null);

const optionNameOf = (property: PageFormulaPropertyInfo, optionId: string): string | null =>
  findPageOption(property.options, optionId)?.value ?? null;

const readStoredList = (property: PageFormulaPropertyInfo, stored: PagePropertyValue | undefined): PageFormulaValue => {
  if (!Array.isArray(stored)) return null;
  const entries: readonly string[] = stored;
  if (property.type !== PAGE_PROPERTY_TYPE.MULTI_SELECT) return entries;
  return entries.flatMap((entry) => optionNameOf(property, entry) ?? []);
};

/** What a stored cell means to a formula: option ids become their names and a missing value is empty. */
export const readPageFormulaStoredValue = (
  property: PageFormulaPropertyInfo,
  stored: PagePropertyValue | undefined,
): PageFormulaValue => {
  switch (property.type) {
    case PAGE_PROPERTY_TYPE.NUMBER:
    case PAGE_PROPERTY_TYPE.UNIQUE_ID:
      return typeof stored === 'number' ? stored : null;
    case PAGE_PROPERTY_TYPE.CHECKBOX:
      return stored === true;
    case PAGE_PROPERTY_TYPE.DATE:
    case PAGE_PROPERTY_TYPE.CREATED_TIME:
    case PAGE_PROPERTY_TYPE.EDITED_TIME:
      return readPageDateValue(stored);
    case PAGE_PROPERTY_TYPE.SELECT:
    case PAGE_PROPERTY_TYPE.STATUS:
      return typeof stored === 'string' ? optionNameOf(property, stored) : null;
    case PAGE_PROPERTY_TYPE.MULTI_SELECT:
    case PAGE_PROPERTY_TYPE.PERSON:
    case PAGE_PROPERTY_TYPE.RELATION:
    case PAGE_PROPERTY_TYPE.FILES:
      return readStoredList(property, stored);
    default:
      return typeof stored === 'string' ? stored : null;
  }
};

const PROPERTY_TYPE_BY_RESULT: Readonly<Record<PageFormulaType, PagePropertyType>> = {
  [PAGE_FORMULA_TYPE.BOOLEAN]: PAGE_PROPERTY_TYPE.CHECKBOX,
  [PAGE_FORMULA_TYPE.DATE]: PAGE_PROPERTY_TYPE.DATE,
  [PAGE_FORMULA_TYPE.LIST]: PAGE_PROPERTY_TYPE.MULTI_SELECT,
  [PAGE_FORMULA_TYPE.NUMBER]: PAGE_PROPERTY_TYPE.NUMBER,
  [PAGE_FORMULA_TYPE.TEXT]: PAGE_PROPERTY_TYPE.RICH_TEXT,
};

/** The type the engine reads a property as: its own, or for a formula or rollup the type of its result. */
export const readPageEffectivePropertyType = (property: {
  readonly computed?: PageComputedConfig | null | undefined;
  readonly type: PagePropertyType;
}): PagePropertyType =>
  isPageComputedPropertyType(property.type)
    ? readPageComputedEffectiveType(
        property.computed?.formula?.resultType ?? property.computed?.rollup?.resultType ?? null,
      )
    : property.type;

/**
 * The stored type that filters, sorts and groups the same way as a computed property's result. The engine compares a
 * computed value exactly as it compares a stored one of that type.
 */
export const readPageComputedEffectiveType = (resultType: PageFormulaType | null): PagePropertyType =>
  PROPERTY_TYPE_BY_RESULT[resultType ?? PAGE_FORMULA_TYPE.TEXT];
