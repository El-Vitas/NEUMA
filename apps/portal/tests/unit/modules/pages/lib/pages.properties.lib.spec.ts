import { describe, expect, it } from 'bun:test';
import {
  buildDefaultPropertyValues,
  findPagePersonOption,
  formatPropertyValueForDisplay,
  getBooleanPropertyValue,
  getEditableSchemaProperties,
  getMultiSelectPropertyValue,
  getNumberPropertyValue,
  getPagePersonOptionLabel,
  getStringPropertyValue,
  hasPersonProperty,
} from '@/modules/pages/collections/lib/pages.properties.lib';
import type {
  PagePersonOption,
  PageSchema,
  PageSchemaProperty,
} from '@/modules/pages/collections/types/pages.schema.types';
import { asPropertyOptions } from './pages.options.fixture';

const titleProperty: PageSchemaProperty = {
  key: 'title',
  label: 'Title',
  options: null,
  required: true,
  type: 'TITLE',
};
const statusProperty: PageSchemaProperty = {
  key: 'status',
  label: 'Status',
  options: asPropertyOptions('todo', 'in_progress', 'done'),
  required: true,
  type: 'SELECT',
};
const teamProperty: PageSchemaProperty = {
  key: 'team',
  label: 'Team',
  options: asPropertyOptions('design', 'engineering'),
  required: false,
  type: 'MULTI_SELECT',
};
const doneProperty: PageSchemaProperty = {
  key: 'done',
  label: 'Done',
  options: null,
  required: false,
  type: 'CHECKBOX',
};
const countProperty: PageSchemaProperty = {
  key: 'count',
  label: 'Count',
  options: null,
  required: false,
  type: 'NUMBER',
};

const rowSchema: PageSchema = {
  pageId: 'collection-1',
  properties: [titleProperty, statusProperty, teamProperty, doneProperty, countProperty],
  spaceId: 'space-1',
  views: [],
};

describe('getEditableSchemaProperties', () => {
  it('excludes the TITLE property and keeps every other property', () => {
    expect(getEditableSchemaProperties(rowSchema)).toEqual([statusProperty, teamProperty, doneProperty, countProperty]);
  });

  it('returns an empty list when the schema is null', () => {
    expect(getEditableSchemaProperties(null)).toEqual([]);
  });
});

describe('buildDefaultPropertyValues', () => {
  it('seeds a sensible default value per property type', () => {
    expect(buildDefaultPropertyValues([statusProperty, teamProperty, doneProperty, countProperty])).toEqual({
      count: 0,
      done: false,
      status: 'todo',
      team: [],
    });
  });
});

describe('property value getters', () => {
  it('extracts a string value and falls back to an empty string', () => {
    expect(getStringPropertyValue('todo')).toBe('todo');
    expect(getStringPropertyValue(undefined)).toBe('');
    expect(getStringPropertyValue(42)).toBe('');
  });

  it('extracts a number value and falls back to zero', () => {
    expect(getNumberPropertyValue(5)).toBe(5);
    expect(getNumberPropertyValue(undefined)).toBe(0);
  });

  it('extracts a boolean value and falls back to false', () => {
    expect(getBooleanPropertyValue(true)).toBe(true);
    expect(getBooleanPropertyValue(undefined)).toBe(false);
  });

  it('extracts a multi-select value and falls back to an empty list', () => {
    expect(getMultiSelectPropertyValue(['design'])).toEqual(['design']);
    expect(getMultiSelectPropertyValue(undefined)).toEqual([]);
  });
});

describe('formatPropertyValueForDisplay', () => {
  it('joins humanized multi-select values with a comma', () => {
    expect(formatPropertyValueForDisplay(teamProperty, ['design', 'engineering'])).toBe('Design, Engineering');
  });

  it('humanizes a select value instead of showing the stored value', () => {
    expect(formatPropertyValueForDisplay(statusProperty, 'in_progress')).toBe('In progress');
  });

  it('stringifies other values', () => {
    expect(formatPropertyValueForDisplay(countProperty, 3)).toBe('3');
  });

  it('returns an empty string when the value is undefined', () => {
    expect(formatPropertyValueForDisplay(statusProperty, undefined)).toBe('');
  });
});

describe('hasPersonProperty', () => {
  const assigneeProperty: PageSchemaProperty = {
    key: 'assignee',
    label: 'Assignee',
    options: null,
    required: false,
    type: 'PERSON',
  };

  it('returns true when a PERSON property is present', () => {
    expect(hasPersonProperty([statusProperty, assigneeProperty])).toBe(true);
  });

  it('returns false when no PERSON property is present', () => {
    expect(hasPersonProperty([statusProperty, teamProperty])).toBe(false);
  });
});

describe('person option helpers', () => {
  const ada: PagePersonOption = { email: 'ada@example.com', id: 'ada-id', name: 'Ada Lovelace' };
  const gracePrimary: PagePersonOption = { email: 'grace@example.com', id: 'grace-id-1', name: 'Grace Hopper' };
  const graceSecondary: PagePersonOption = { email: 'grace2@example.com', id: 'grace-id-2', name: 'Grace Hopper' };
  const options: readonly PagePersonOption[] = [ada, gracePrimary, graceSecondary];

  it('finds a person option by id', () => {
    expect(findPagePersonOption(options, 'ada-id')).toEqual(ada);
  });

  it('returns undefined when no option matches the id', () => {
    expect(findPagePersonOption(options, 'missing-id')).toBeUndefined();
  });

  it('labels a person by name alone when it is unambiguous', () => {
    expect(getPagePersonOptionLabel(options, ada)).toBe('Ada Lovelace');
  });

  it('disambiguates same-named people with their email', () => {
    expect(getPagePersonOptionLabel(options, gracePrimary)).toBe('Grace Hopper (grace@example.com)');
    expect(getPagePersonOptionLabel(options, graceSecondary)).toBe('Grace Hopper (grace2@example.com)');
  });
});
