import type { PagePropertyType } from '../types/page-schema.types.js';
import { PAGE_PROPERTY_TYPE } from '../types/page-schema.types.js';
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
  isTitle: false,
  requiresOptions: false,
  requiresPersonDirectory: false,
  canGroupBoard: false,
};

const isStringArray = (value: PagePropertyValue): value is readonly string[] => Array.isArray(value);

const hasUniqueEntries = (values: readonly string[]): boolean => new Set(values).size === values.length;

const isDeclaredOption = (value: string, context: PagePropertyContext): boolean =>
  context.options?.includes(value) === true;

export const humanizeSelectOption = (rawOption: string): string => {
  const normalized = rawOption.replaceAll(/[_-]+/g, ' ').trim().toLowerCase();
  if (normalized.length === 0) return normalized;
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
};

const isBlankText = (value: PagePropertyValue): boolean => typeof value === 'string' && value.trim().length === 0;

const isEmptyCollection = (value: PagePropertyValue): boolean => isStringArray(value) && value.length === 0;

const isNeverEmpty = (): boolean => false;

const titleDefinition: PagePropertyDefinition = {
  type: PAGE_PROPERTY_TYPE.TITLE,
  logicalType: PAGE_PROPERTY_LOGICAL_TYPE.TEXT,
  capabilities: { ...baseCapabilities, isTitle: true },
  getDefaultValue: () => '',
  isValidValue: (value) => typeof value === 'string' && value.trim().length > 0 && value.length <= titleMaximumLength,
  isEmptyValue: isBlankText,
  toDisplayString: String,
};

const richTextDefinition: PagePropertyDefinition = {
  type: PAGE_PROPERTY_TYPE.RICH_TEXT,
  logicalType: PAGE_PROPERTY_LOGICAL_TYPE.TEXT,
  capabilities: baseCapabilities,
  getDefaultValue: () => '',
  isValidValue: (value) => typeof value === 'string' && value.length <= richTextMaximumLength,
  isEmptyValue: isBlankText,
  toDisplayString: String,
};

const selectDefinition: PagePropertyDefinition = {
  type: PAGE_PROPERTY_TYPE.SELECT,
  logicalType: PAGE_PROPERTY_LOGICAL_TYPE.TAG,
  capabilities: { ...baseCapabilities, requiresOptions: true, canGroupBoard: true },
  getDefaultValue: (context) => context.options?.[0] ?? '',
  isValidValue: (value, context) => typeof value === 'string' && isDeclaredOption(value, context),
  isEmptyValue: isBlankText,
  toDisplayString: (value) => humanizeSelectOption(String(value)),
};

const multiSelectDefinition: PagePropertyDefinition = {
  type: PAGE_PROPERTY_TYPE.MULTI_SELECT,
  logicalType: PAGE_PROPERTY_LOGICAL_TYPE.MULTI_TAG,
  capabilities: { ...baseCapabilities, requiresOptions: true },
  getDefaultValue: () => [],
  isValidValue: (value, context) =>
    isStringArray(value) && hasUniqueEntries(value) && value.every((entry) => isDeclaredOption(entry, context)),
  isEmptyValue: isEmptyCollection,
  toDisplayString: (value) => (isStringArray(value) ? value.map(humanizeSelectOption).join(', ') : String(value)),
};

const personDefinition: PagePropertyDefinition = {
  type: PAGE_PROPERTY_TYPE.PERSON,
  logicalType: PAGE_PROPERTY_LOGICAL_TYPE.TAG,
  capabilities: { ...baseCapabilities, requiresPersonDirectory: true },
  getDefaultValue: () => '',
  isValidValue: (value, context) => typeof value === 'string' && context.personIds?.has(value) === true,
  isEmptyValue: isBlankText,
  toDisplayString: String,
};

const dateDefinition: PagePropertyDefinition = {
  type: PAGE_PROPERTY_TYPE.DATE,
  logicalType: PAGE_PROPERTY_LOGICAL_TYPE.DATE,
  /** One board column per date the rows use; dates are not declared in advance. */
  capabilities: { ...baseCapabilities, canGroupBoard: true },
  getDefaultValue: () => '',
  isValidValue: (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value)),
  isEmptyValue: isBlankText,
  toDisplayString: String,
};

const checkboxDefinition: PagePropertyDefinition = {
  type: PAGE_PROPERTY_TYPE.CHECKBOX,
  logicalType: PAGE_PROPERTY_LOGICAL_TYPE.BOOLEAN,
  /** Two board columns: checked or not. */
  capabilities: { ...baseCapabilities, canGroupBoard: true },
  getDefaultValue: () => false,
  isValidValue: (value) => typeof value === 'boolean',
  isEmptyValue: isNeverEmpty,
  toDisplayString: String,
};

const numberDefinition: PagePropertyDefinition = {
  type: PAGE_PROPERTY_TYPE.NUMBER,
  logicalType: PAGE_PROPERTY_LOGICAL_TYPE.NUMBER,
  /** One board column per number the rows use, e.g. sizes, points or floors. */
  capabilities: { ...baseCapabilities, canGroupBoard: true },
  getDefaultValue: () => 0,
  isValidValue: (value) => typeof value === 'number' && Number.isFinite(value),
  isEmptyValue: isNeverEmpty,
  toDisplayString: String,
};

export const PAGE_PROPERTY_DEFINITIONS = {
  [PAGE_PROPERTY_TYPE.TITLE]: titleDefinition,
  [PAGE_PROPERTY_TYPE.RICH_TEXT]: richTextDefinition,
  [PAGE_PROPERTY_TYPE.SELECT]: selectDefinition,
  [PAGE_PROPERTY_TYPE.MULTI_SELECT]: multiSelectDefinition,
  [PAGE_PROPERTY_TYPE.PERSON]: personDefinition,
  [PAGE_PROPERTY_TYPE.DATE]: dateDefinition,
  [PAGE_PROPERTY_TYPE.CHECKBOX]: checkboxDefinition,
  [PAGE_PROPERTY_TYPE.NUMBER]: numberDefinition,
} as const satisfies Record<PagePropertyType, PagePropertyDefinition>;
