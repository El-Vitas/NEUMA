import type { PagePropertyType } from '../types/page-schema.types.js';
import { PAGE_PROPERTY_TYPE } from '../types/page-schema.types.js';
import { isOneOf } from '../value-list.lib.js';
import { PAGE_NUMBER_MAX_DECIMALS, PAGE_UNIQUE_ID_PREFIX_MAX_LENGTH } from './page-property.constants.js';
import type { PageNumberFormat, PagePropertyConfig } from './page-property.types.js';
import { PAGE_NUMBER_FORMAT, PAGE_NUMBER_FORMAT_VALUES } from './page-property.types.js';

export const DEFAULT_PAGE_PROPERTY_CONFIG: PagePropertyConfig = {
  allowsMultiple: false,
  currency: null,
  decimals: null,
  mirrorPropertyKey: null,
  numberFormat: PAGE_NUMBER_FORMAT.NUMBER,
  prefix: '',
  targetCollectionId: null,
};

type ConfigField = keyof PagePropertyConfig;

const CONFIG_FIELDS_BY_TYPE: Partial<Record<PagePropertyType, readonly ConfigField[]>> = {
  [PAGE_PROPERTY_TYPE.PERSON]: ['allowsMultiple'],
  [PAGE_PROPERTY_TYPE.NUMBER]: ['currency', 'decimals', 'numberFormat'],
  [PAGE_PROPERTY_TYPE.UNIQUE_ID]: ['prefix'],
  [PAGE_PROPERTY_TYPE.RELATION]: ['mirrorPropertyKey', 'targetCollectionId'],
};

const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

const UNIQUE_ID_PREFIX_PATTERN = /^[A-Za-z0-9_-]*$/;

const isRecord = (stored: unknown): stored is Readonly<Record<string, unknown>> =>
  typeof stored === 'object' && stored !== null && !Array.isArray(stored);

const readNumberFormat = (candidate: unknown): PageNumberFormat =>
  typeof candidate === 'string' && isOneOf(PAGE_NUMBER_FORMAT_VALUES, candidate)
    ? candidate
    : DEFAULT_PAGE_PROPERTY_CONFIG.numberFormat;

const readText = (candidate: unknown): string | null =>
  typeof candidate === 'string' && candidate !== '' ? candidate : null;

/** Lenient: a field of the wrong kind is ignored, so a stored property never fails to open. */
export const readPagePropertyConfig = (stored: unknown): PagePropertyConfig => {
  if (!isRecord(stored)) return DEFAULT_PAGE_PROPERTY_CONFIG;
  return {
    allowsMultiple: stored.allowsMultiple === true,
    currency: readText(stored.currency),
    decimals: typeof stored.decimals === 'number' ? stored.decimals : null,
    mirrorPropertyKey: readText(stored.mirrorPropertyKey),
    numberFormat: readNumberFormat(stored.numberFormat),
    prefix: typeof stored.prefix === 'string' ? stored.prefix : '',
    targetCollectionId: readText(stored.targetCollectionId),
  };
};

/** Only the fields the type uses are stored; a type that uses none stores nothing. */
export const writePagePropertyConfig = (
  type: PagePropertyType,
  config: PagePropertyConfig,
): Readonly<Record<string, unknown>> | null => {
  const fields = CONFIG_FIELDS_BY_TYPE[type];
  if (fields === undefined) return null;
  const written: Record<string, unknown> = {};
  for (const field of fields) {
    if (config[field] !== null) written[field] = config[field];
  }
  return written;
};

const findUnusedField = (type: PagePropertyType, config: PagePropertyConfig): ConfigField | null => {
  const used = CONFIG_FIELDS_BY_TYPE[type] ?? [];
  const fields = Object.keys(DEFAULT_PAGE_PROPERTY_CONFIG) as ConfigField[];
  return fields.find((field) => !used.includes(field) && config[field] !== DEFAULT_PAGE_PROPERTY_CONFIG[field]) ?? null;
};

const validateNumberConfig = (config: PagePropertyConfig): string | null => {
  const { currency, decimals, numberFormat } = config;
  if (decimals !== null && (!Number.isInteger(decimals) || decimals < 0 || decimals > PAGE_NUMBER_MAX_DECIMALS)) {
    return `Decimals must be a whole number from 0 to ${String(PAGE_NUMBER_MAX_DECIMALS)}`;
  }
  if (numberFormat === PAGE_NUMBER_FORMAT.CURRENCY && (currency === null || !CURRENCY_CODE_PATTERN.test(currency))) {
    return 'A currency needs a three-letter code in capitals';
  }
  return null;
};

const validateUniqueIdConfig = (config: PagePropertyConfig): string | null =>
  config.prefix.length > PAGE_UNIQUE_ID_PREFIX_MAX_LENGTH || !UNIQUE_ID_PREFIX_PATTERN.test(config.prefix)
    ? `A prefix is up to ${String(PAGE_UNIQUE_ID_PREFIX_MAX_LENGTH)} letters, digits, hyphens or underscores`
    : null;

const validateRelationConfig = (config: PagePropertyConfig): string | null =>
  config.targetCollectionId === null ? 'A relation needs the collection it points to' : null;

const validateOwnFields = (type: PagePropertyType, config: PagePropertyConfig): string | null => {
  switch (type) {
    case PAGE_PROPERTY_TYPE.NUMBER:
      return validateNumberConfig(config);
    case PAGE_PROPERTY_TYPE.UNIQUE_ID:
      return validateUniqueIdConfig(config);
    case PAGE_PROPERTY_TYPE.RELATION:
      return validateRelationConfig(config);
    default:
      return null;
  }
};

/** Null when the configuration fits the type, otherwise what is wrong with it. */
export const validatePagePropertyConfig = (type: PagePropertyType, config: PagePropertyConfig): string | null => {
  const unused = findUnusedField(type, config);
  if (unused !== null) return `A ${type} property does not use ${unused}`;
  return validateOwnFields(type, config);
};
