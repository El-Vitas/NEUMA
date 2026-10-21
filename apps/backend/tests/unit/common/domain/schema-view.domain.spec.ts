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
  property('begin', DatabasePropertyType.DATE),
  property('owners', DatabasePropertyType.PERSON),
  property('notes', DatabasePropertyType.RICH_TEXT),
  property('photos', DatabasePropertyType.FILES),
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

describe('validating what a timeline and a gallery point at', () => {
  const timeline = (configuration: Record<string, unknown>) => ({ configuration, type: DatabaseViewType.TIMELINE });
  const gallery = (configuration: Record<string, unknown>) => ({ configuration, type: DatabaseViewType.GALLERY });

  it('accepts a timeline that reads its start and its end from date properties', () => {
    const view = timeline({ dateProperty: 'begin', dateScale: 'WEEK', endDateProperty: 'due' });

    expect(validateSchemaView(view, properties).isOk()).toBe(true);
  });

  it('accepts a timeline that has not chosen its dates yet', () => {
    expect(validateSchemaView(timeline({}), properties).isOk()).toBe(true);
  });

  it('refuses a start that is not a date', () => {
    const result = validateSchemaView(timeline({ dateProperty: 'notes' }), properties);

    expect(result.isFail()).toBe(true);
    expect(result.isFail() && String(result.getError().details)).toContain('dateProperty');
  });

  it('refuses an end that is not a date', () => {
    expect(validateSchemaView(timeline({ endDateProperty: 'owners' }), properties).isFail()).toBe(true);
  });

  it('refuses a cover that is not a files property', () => {
    expect(validateSchemaView(gallery({ coverProperty: 'photos' }), properties).isOk()).toBe(true);
    expect(validateSchemaView(gallery({ coverProperty: 'notes' }), properties).isFail()).toBe(true);
  });

  it('lets a property that was deleted go by, so the rest of the view can still be changed', () => {
    const view = timeline({ dateProperty: 'gone', coverProperty: 'gone', endDateProperty: 'gone' });

    expect(validateSchemaView(view, properties).isOk()).toBe(true);
  });
});
