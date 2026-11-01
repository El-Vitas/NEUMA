import type { PagePropertyType } from '../types/page-schema.types.js';
import { PAGE_PROPERTY_TYPE } from '../types/page-schema.types.js';
import { formatPageDate, readPageDateValue } from './page-property.date.lib.js';
import { formatPageNumber, formatPageUniqueId } from './page-property.number.lib.js';
import { findPageOption } from './page-property.option.lib.js';
import type { PagePropertyConfig, PagePropertyOption, PagePropertyValue } from './page-property.types.js';
import { toValueList, toValueText } from './page-property.value.lib.js';

/** Names for the ids a row stores. A row, a person or a file the reader may not see is simply not in the map. */
export interface PageNameLookup {
  readonly files: ReadonlyMap<string, string>;
  readonly people: ReadonlyMap<string, string>;
  readonly rows: ReadonlyMap<string, string>;
}

export interface PageExportProperty {
  readonly config: PagePropertyConfig;
  readonly options: readonly PagePropertyOption[] | null;
  readonly type: PagePropertyType;
}

const LIST_SEPARATOR = ', ';

const asList = toValueList;

const asText = toValueText;

const joinNames = (ids: readonly string[], names: ReadonlyMap<string, string>): string =>
  ids.flatMap((id) => names.get(id) ?? []).join(LIST_SEPARATOR);

const writeOptionName = (property: PageExportProperty, optionId: string): string =>
  findPageOption(property.options, optionId)?.value ?? '';

const writeDate = (value: PagePropertyValue): string => {
  const date = readPageDateValue(value);
  return date === null ? '' : formatPageDate(date);
};

const writeUniqueId = (property: PageExportProperty, value: PagePropertyValue): string =>
  typeof value === 'number' ? formatPageUniqueId(property.config.prefix, value) : '';

const writeKnownValue = (property: PageExportProperty, value: PagePropertyValue, names: PageNameLookup): string => {
  switch (property.type) {
    case PAGE_PROPERTY_TYPE.SELECT:
    case PAGE_PROPERTY_TYPE.STATUS:
      return writeOptionName(property, asText(value));
    case PAGE_PROPERTY_TYPE.MULTI_SELECT:
      return asList(value)
        .map((optionId) => writeOptionName(property, optionId))
        .filter((name) => name !== '')
        .join(LIST_SEPARATOR);
    case PAGE_PROPERTY_TYPE.PERSON:
      return joinNames(asList(value), names.people);
    case PAGE_PROPERTY_TYPE.CREATED_BY:
    case PAGE_PROPERTY_TYPE.EDITED_BY:
      return joinNames([asText(value)], names.people);
    case PAGE_PROPERTY_TYPE.DATE:
      return writeDate(value);
    case PAGE_PROPERTY_TYPE.CREATED_TIME:
    case PAGE_PROPERTY_TYPE.EDITED_TIME:
      return readPageDateValue(value)?.start ?? '';
    case PAGE_PROPERTY_TYPE.NUMBER:
      return typeof value === 'number' ? formatPageNumber(value, property.config) : '';
    case PAGE_PROPERTY_TYPE.UNIQUE_ID:
      return writeUniqueId(property, value);
    case PAGE_PROPERTY_TYPE.RELATION:
      return joinNames(asList(value), names.rows);
    case PAGE_PROPERTY_TYPE.FILES:
      return joinNames(asList(value), names.files);
    default:
      return asText(value);
  }
};

/**
 * The one way to say a value in words: the MCP, the export of a page and copying a cell all use it, so they cannot
 * disagree. It uses no locale, and a name the reader may not see never reaches the text.
 */
export const toPageExportText = (
  property: PageExportProperty,
  value: PagePropertyValue | undefined,
  names: PageNameLookup,
): string => (value === undefined ? '' : writeKnownValue(property, value, names));
