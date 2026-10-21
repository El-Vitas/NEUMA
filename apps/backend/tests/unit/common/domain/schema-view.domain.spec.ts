import { describe, expect, it } from 'bun:test';
import { DatabasePropertyType, DatabaseViewType } from '@neuma/db';
import { DEFAULT_PAGE_PROPERTY_CONFIG } from '@neuma/shared';
import type { SchemaPropertyDefinition } from '@/common/domain/schema.domain.types';
import { validateSchemaView } from '@/common/domain/schema-view.domain';

const property = (key: string, type: DatabasePropertyType): SchemaPropertyDefinition => ({
  config: DEFAULT_PAGE_PROPERTY_CONFIG,
  key,
  label: key,
  options: null,
  required: false,
  type,
});

const properties = [
  property('due', DatabasePropertyType.DATE),
  property('owners', DatabasePropertyType.PERSON),
  property('notes', DatabasePropertyType.RICH_TEXT),
];

const tableWithFilter = (propertyKey: string, value: unknown) => ({
  configuration: { filter: { kind: 'CONDITION', operator: 'IS', propertyKey, value } },
  type: DatabaseViewType.TABLE,
});

describe('validating the markers of a view filter', () => {
  it('accepts a relative date on a date and "me" on a person', () => {
    expect(validateSchemaView(tableWithFilter('due', '@this_week'), properties).isOk()).toBe(true);
    expect(validateSchemaView(tableWithFilter('due', '@past_days:14'), properties).isOk()).toBe(true);
    expect(validateSchemaView(tableWithFilter('owners', '@me'), properties).isOk()).toBe(true);
  });

  it('refuses a date marker that is not one, saying which', () => {
    const result = validateSchemaView(tableWithFilter('due', '@someday'), properties);

    expect(result.isFail()).toBe(true);
    expect(result.isFail() && String(result.getError().details)).toContain('@someday');
  });

  it('refuses a person marker that is not "me"', () => {
    expect(validateSchemaView(tableWithFilter('owners', '@you'), properties).isFail()).toBe(true);
  });

  it('leaves text with an at sign alone', () => {
    expect(validateSchemaView(tableWithFilter('notes', '@someone'), properties).isOk()).toBe(true);
  });
});
