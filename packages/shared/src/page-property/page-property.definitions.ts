import type { PagePropertyType } from '../types/page-schema.types.js';
import { PAGE_PROPERTY_TYPE } from '../types/page-schema.types.js';
import { PAGE_FILES_MAX_ENTRIES, PAGE_RELATION_MAX_ENTRIES } from './page-property.constants.js';
import { isValidPageEmail, isValidPagePhone, isValidPageUrl } from './page-property.contact.lib.js';
import { formatPageDate, isPageDateValue, isValidPageDateValue } from './page-property.date.lib.js';
import { formatPageNumber, formatPageUniqueId, hasAllowedDecimals } from './page-property.number.lib.js';
import { findPageOption } from './page-property.option.lib.js';
import type {
  PagePropertyCapabilities,
  PagePropertyContext,
  PagePropertyDefinition,
  PagePropertyValue,
} from './page-property.types.js';
import { PAGE_PROPERTY_LOGICAL_TYPE } from './page-property.types.js';

const titleMaximumLength = 200;

/** Generous but a cell is not a document: long writing belongs in the row's page body. */
const richTextMaximumLength = 2000;

const baseCapabilities: PagePropertyCapabilities = {
  canBeRequired: true,
  canGroupBoard: false,
  isSystemManaged: false,
  isTitle: false,
  requiresOptions: false,
  requiresPersonDirectory: false,
};

const systemManagedCapabilities: PagePropertyCapabilities = {
  ...baseCapabilities,
  canBeRequired: false,
  isSystemManaged: true,
};

const isStringArray = (value: PagePropertyValue): value is readonly string[] => Array.isArray(value);

const hasUniqueEntries = (values: readonly string[]): boolean => new Set(values).size === values.length;

const isDeclaredOption = (value: string, context: PagePropertyContext): boolean =>
  findPageOption(context.options, value) !== null;

export const humanizeSelectOption = (rawOption: string): string => {
  const normalized = rawOption.replaceAll(/[_-]+/g, ' ').trim().toLowerCase();
  if (normalized.length === 0) return normalized;
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
};

const isBlankText = (value: PagePropertyValue): boolean => typeof value === 'string' && value.trim().length === 0;

const isEmptyCollection = (value: PagePropertyValue): boolean => isStringArray(value) && value.length === 0;

const isNeverEmpty = (): boolean => false;

const isDateAbsent = (value: PagePropertyValue): boolean => !isPageDateValue(value);

const toOptionName = (optionId: string, context: PagePropertyContext): string => {
  const option = findPageOption(context.options, optionId);
  return option === null ? '' : humanizeSelectOption(option.value);
};

const toPlainText = (value: PagePropertyValue): string => (typeof value === 'object' ? '' : String(value));

const toDateText = (value: PagePropertyValue): string => (isPageDateValue(value) ? formatPageDate(value) : '');

const isIdList = (value: PagePropertyValue, maximum: number): value is readonly string[] =>
  isStringArray(value) && value.length <= maximum && hasUniqueEntries(value) && value.every((entry) => entry !== '');

const isValidTextOr = (value: PagePropertyValue, isValid: (text: string) => boolean): boolean =>
  typeof value === 'string' && (value === '' || isValid(value));

const titleDefinition: PagePropertyDefinition = {
  type: PAGE_PROPERTY_TYPE.TITLE,
  logicalType: PAGE_PROPERTY_LOGICAL_TYPE.TEXT,
  capabilities: { ...baseCapabilities, canBeRequired: false, isTitle: true },
  getDefaultValue: () => '',
  isValidValue: (value) => typeof value === 'string' && value.trim().length > 0 && value.length <= titleMaximumLength,
  isEmptyValue: isBlankText,
  toDisplayString: toPlainText,
};

const richTextDefinition: PagePropertyDefinition = {
  type: PAGE_PROPERTY_TYPE.RICH_TEXT,
  logicalType: PAGE_PROPERTY_LOGICAL_TYPE.TEXT,
  capabilities: baseCapabilities,
  getDefaultValue: () => '',
  isValidValue: (value) => typeof value === 'string' && value.length <= richTextMaximumLength,
  isEmptyValue: isBlankText,
  toDisplayString: toPlainText,
};

const selectDefinition: PagePropertyDefinition = {
  type: PAGE_PROPERTY_TYPE.SELECT,
  logicalType: PAGE_PROPERTY_LOGICAL_TYPE.TAG,
  capabilities: { ...baseCapabilities, requiresOptions: true, canGroupBoard: true },
  getDefaultValue: (context) => context.options?.[0]?.id ?? '',
  isValidValue: (value, context) => typeof value === 'string' && isDeclaredOption(value, context),
  isEmptyValue: isBlankText,
  toDisplayString: (value, context) => toOptionName(toPlainText(value), context),
};

const multiSelectDefinition: PagePropertyDefinition = {
  type: PAGE_PROPERTY_TYPE.MULTI_SELECT,
  logicalType: PAGE_PROPERTY_LOGICAL_TYPE.MULTI_TAG,
  capabilities: { ...baseCapabilities, canGroupBoard: true, requiresOptions: true },
  getDefaultValue: () => [],
  isValidValue: (value, context) =>
    isStringArray(value) && hasUniqueEntries(value) && value.every((entry) => isDeclaredOption(entry, context)),
  isEmptyValue: isEmptyCollection,
  toDisplayString: (value, context) =>
    isStringArray(value) ? value.map((entry) => toOptionName(entry, context)).join(', ') : '',
};

const statusDefinition: PagePropertyDefinition = {
  type: PAGE_PROPERTY_TYPE.STATUS,
  logicalType: PAGE_PROPERTY_LOGICAL_TYPE.STATUS,
  /** A status always has a value, so there is nothing for a person to require. */
  capabilities: { ...baseCapabilities, canBeRequired: false, requiresOptions: true, canGroupBoard: true },
  getDefaultValue: (context) =>
    (context.options?.find((option) => option.group === 'TO_DO') ?? context.options?.[0])?.id ?? '',
  isValidValue: (value, context) => typeof value === 'string' && isDeclaredOption(value, context),
  isEmptyValue: isBlankText,
  toDisplayString: (value, context) => toOptionName(toPlainText(value), context),
};

const personDefinition: PagePropertyDefinition = {
  type: PAGE_PROPERTY_TYPE.PERSON,
  logicalType: PAGE_PROPERTY_LOGICAL_TYPE.MULTI_TAG,
  capabilities: { ...baseCapabilities, canGroupBoard: true, requiresPersonDirectory: true },
  getDefaultValue: () => [],
  isValidValue: (value, context) =>
    isStringArray(value) &&
    hasUniqueEntries(value) &&
    (context.config.allowsMultiple || value.length <= 1) &&
    value.every((entry) => context.personIds?.has(entry) === true),
  isEmptyValue: isEmptyCollection,
  toDisplayString: (value) => (isStringArray(value) ? value.join(', ') : ''),
};

const dateDefinition: PagePropertyDefinition = {
  type: PAGE_PROPERTY_TYPE.DATE,
  logicalType: PAGE_PROPERTY_LOGICAL_TYPE.DATE,
  /** One board column per date the rows use; dates are not declared in advance. */
  capabilities: { ...baseCapabilities, canGroupBoard: true },
  getDefaultValue: () => '',
  isValidValue: (value) => isPageDateValue(value) && isValidPageDateValue(value),
  isEmptyValue: isDateAbsent,
  toDisplayString: toDateText,
};

const checkboxDefinition: PagePropertyDefinition = {
  type: PAGE_PROPERTY_TYPE.CHECKBOX,
  logicalType: PAGE_PROPERTY_LOGICAL_TYPE.BOOLEAN,
  /** Two board columns: checked or not. A checkbox is never missing, so there is nothing to require. */
  capabilities: { ...baseCapabilities, canBeRequired: false, canGroupBoard: true },
  getDefaultValue: () => false,
  isValidValue: (value) => typeof value === 'boolean',
  isEmptyValue: isNeverEmpty,
  toDisplayString: toPlainText,
};

const numberDefinition: PagePropertyDefinition = {
  type: PAGE_PROPERTY_TYPE.NUMBER,
  logicalType: PAGE_PROPERTY_LOGICAL_TYPE.NUMBER,
  /** One board column per number the rows use, e.g. sizes, points or floors. */
  capabilities: { ...baseCapabilities, canGroupBoard: true },
  getDefaultValue: () => 0,
  isValidValue: (value, context) =>
    typeof value === 'number' && Number.isFinite(value) && hasAllowedDecimals(value, context.config),
  isEmptyValue: isNeverEmpty,
  toDisplayString: (value, context) => (typeof value === 'number' ? formatPageNumber(value, context.config) : ''),
};

const relationDefinition: PagePropertyDefinition = {
  type: PAGE_PROPERTY_TYPE.RELATION,
  logicalType: PAGE_PROPERTY_LOGICAL_TYPE.RELATION,
  capabilities: baseCapabilities,
  getDefaultValue: () => [],
  isValidValue: (value) => isIdList(value, PAGE_RELATION_MAX_ENTRIES),
  isEmptyValue: isEmptyCollection,
  toDisplayString: (value) => (isStringArray(value) ? value.join(', ') : ''),
};

const urlDefinition: PagePropertyDefinition = {
  type: PAGE_PROPERTY_TYPE.URL,
  logicalType: PAGE_PROPERTY_LOGICAL_TYPE.TEXT,
  capabilities: baseCapabilities,
  getDefaultValue: () => '',
  isValidValue: (value) => isValidTextOr(value, isValidPageUrl),
  isEmptyValue: isBlankText,
  toDisplayString: toPlainText,
};

const emailDefinition: PagePropertyDefinition = {
  type: PAGE_PROPERTY_TYPE.EMAIL,
  logicalType: PAGE_PROPERTY_LOGICAL_TYPE.TEXT,
  capabilities: baseCapabilities,
  getDefaultValue: () => '',
  isValidValue: (value) => isValidTextOr(value, isValidPageEmail),
  isEmptyValue: isBlankText,
  toDisplayString: toPlainText,
};

const phoneDefinition: PagePropertyDefinition = {
  type: PAGE_PROPERTY_TYPE.PHONE,
  logicalType: PAGE_PROPERTY_LOGICAL_TYPE.TEXT,
  capabilities: baseCapabilities,
  getDefaultValue: () => '',
  isValidValue: (value) => isValidTextOr(value, isValidPagePhone),
  isEmptyValue: isBlankText,
  toDisplayString: toPlainText,
};

const filesDefinition: PagePropertyDefinition = {
  type: PAGE_PROPERTY_TYPE.FILES,
  logicalType: PAGE_PROPERTY_LOGICAL_TYPE.FILES,
  capabilities: baseCapabilities,
  getDefaultValue: () => [],
  isValidValue: (value) => isIdList(value, PAGE_FILES_MAX_ENTRIES),
  isEmptyValue: isEmptyCollection,
  toDisplayString: (value) => (isStringArray(value) ? value.join(', ') : ''),
};

const createdTimeDefinition: PagePropertyDefinition = {
  type: PAGE_PROPERTY_TYPE.CREATED_TIME,
  logicalType: PAGE_PROPERTY_LOGICAL_TYPE.DATE,
  capabilities: { ...systemManagedCapabilities, canGroupBoard: true },
  getDefaultValue: () => '',
  isValidValue: () => false,
  isEmptyValue: isDateAbsent,
  toDisplayString: toDateText,
};

const editedTimeDefinition: PagePropertyDefinition = {
  ...createdTimeDefinition,
  type: PAGE_PROPERTY_TYPE.EDITED_TIME,
};

const createdByDefinition: PagePropertyDefinition = {
  type: PAGE_PROPERTY_TYPE.CREATED_BY,
  logicalType: PAGE_PROPERTY_LOGICAL_TYPE.TAG,
  capabilities: systemManagedCapabilities,
  getDefaultValue: () => '',
  isValidValue: () => false,
  isEmptyValue: isBlankText,
  toDisplayString: toPlainText,
};

const editedByDefinition: PagePropertyDefinition = {
  ...createdByDefinition,
  type: PAGE_PROPERTY_TYPE.EDITED_BY,
};

const uniqueIdDefinition: PagePropertyDefinition = {
  type: PAGE_PROPERTY_TYPE.UNIQUE_ID,
  logicalType: PAGE_PROPERTY_LOGICAL_TYPE.NUMBER,
  capabilities: systemManagedCapabilities,
  getDefaultValue: () => 0,
  isValidValue: (value) => typeof value === 'number' && Number.isInteger(value) && value > 0,
  isEmptyValue: isNeverEmpty,
  toDisplayString: (value, context) =>
    typeof value === 'number' ? formatPageUniqueId(context.config.prefix, value) : '',
};

/**
 * A formula or rollup is computed on every read and never stored, so a write is always refused. What its value is
 * (number, text, date) depends on its configuration: the engine reads it as the type of its result.
 */
const computedDefinition: PagePropertyDefinition = {
  type: PAGE_PROPERTY_TYPE.FORMULA,
  logicalType: PAGE_PROPERTY_LOGICAL_TYPE.TEXT,
  capabilities: systemManagedCapabilities,
  getDefaultValue: () => '',
  isValidValue: () => false,
  isEmptyValue: (value) => isBlankText(value) || isEmptyCollection(value),
  toDisplayString: (value) => (isStringArray(value) ? value.join(', ') : toPlainText(value)),
};

const formulaDefinition: PagePropertyDefinition = computedDefinition;

const rollupDefinition: PagePropertyDefinition = { ...computedDefinition, type: PAGE_PROPERTY_TYPE.ROLLUP };

export const PAGE_PROPERTY_DEFINITIONS = {
  [PAGE_PROPERTY_TYPE.TITLE]: titleDefinition,
  [PAGE_PROPERTY_TYPE.RICH_TEXT]: richTextDefinition,
  [PAGE_PROPERTY_TYPE.SELECT]: selectDefinition,
  [PAGE_PROPERTY_TYPE.MULTI_SELECT]: multiSelectDefinition,
  [PAGE_PROPERTY_TYPE.PERSON]: personDefinition,
  [PAGE_PROPERTY_TYPE.DATE]: dateDefinition,
  [PAGE_PROPERTY_TYPE.CHECKBOX]: checkboxDefinition,
  [PAGE_PROPERTY_TYPE.NUMBER]: numberDefinition,
  [PAGE_PROPERTY_TYPE.STATUS]: statusDefinition,
  [PAGE_PROPERTY_TYPE.RELATION]: relationDefinition,
  [PAGE_PROPERTY_TYPE.URL]: urlDefinition,
  [PAGE_PROPERTY_TYPE.EMAIL]: emailDefinition,
  [PAGE_PROPERTY_TYPE.PHONE]: phoneDefinition,
  [PAGE_PROPERTY_TYPE.FILES]: filesDefinition,
  [PAGE_PROPERTY_TYPE.CREATED_TIME]: createdTimeDefinition,
  [PAGE_PROPERTY_TYPE.EDITED_TIME]: editedTimeDefinition,
  [PAGE_PROPERTY_TYPE.CREATED_BY]: createdByDefinition,
  [PAGE_PROPERTY_TYPE.EDITED_BY]: editedByDefinition,
  [PAGE_PROPERTY_TYPE.UNIQUE_ID]: uniqueIdDefinition,
  [PAGE_PROPERTY_TYPE.FORMULA]: formulaDefinition,
  [PAGE_PROPERTY_TYPE.ROLLUP]: rollupDefinition,
} as const satisfies Record<PagePropertyType, PagePropertyDefinition>;
