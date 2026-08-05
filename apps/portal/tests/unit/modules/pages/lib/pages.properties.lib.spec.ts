import { describe, expect, it } from 'bun:test';
import {
  buildDefaultPropertyValues,
  formatPropertyValueForDisplay,
  getBooleanPropertyValue,
  getEditableSchemaProperties,
  getMultiSelectPropertyValue,
  getNumberPropertyValue,
  getStringPropertyValue,
} from '@/modules/pages/lib/pages.properties.lib';
import type { PageSchema, PageSchemaProperty } from '@/modules/pages/types/pages.schema.types';

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
  options: ['todo', 'in_progress', 'done'],
  required: true,
  type: 'SELECT',
};
const teamProperty: PageSchemaProperty = {
  key: 'team',
  label: 'Team',
  options: ['design', 'engineering'],
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
  it('joins multi-select values with a comma', () => {
    expect(formatPropertyValueForDisplay(teamProperty, ['design', 'engineering'])).toBe('design, engineering');
  });

  it('stringifies other values', () => {
    expect(formatPropertyValueForDisplay(countProperty, 3)).toBe('3');
  });

  it('returns an empty string when the value is undefined', () => {
    expect(formatPropertyValueForDisplay(statusProperty, undefined)).toBe('');
  });
});
