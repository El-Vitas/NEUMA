import { describe, expect, it } from 'bun:test';
import {
  buildDefaultPropertyValues,
  findPagePersonOption,
  formatPropertyValueForDisplay,
  getBooleanPropertyValue,
  getDatePropertyValue,
  getEditableSchemaProperties,
  getListPropertyValue,
  getNumberPropertyValue,
  getPagePersonOptionLabel,
  getStringPropertyValue,
  hasPersonProperty,
  isPropertyBulkAssignable,
  isPropertyEditableInPlace,
  isPropertyReadableWithoutLookups,
  joinPropertyNames,
  readPagePersonDisplayName,
  readPropertyLinkHref,
} from '@/modules/pages/collections/lib/pages.properties.lib';
import type {
  PagePersonOption,
  PageSchema,
  PageSchemaProperty,
} from '@/modules/pages/collections/types/pages.schema.types';
import { asPropertyOptions, defaultConfig } from './pages.options.fixture';

const titleProperty: PageSchemaProperty = {
  config: defaultConfig,
  key: 'title',
  label: 'Title',
  options: null,
  required: true,
  type: 'TITLE',
};
const statusProperty: PageSchemaProperty = {
  config: defaultConfig,
  key: 'status',
  label: 'Status',
  options: asPropertyOptions('todo', 'in_progress', 'done'),
  required: true,
  type: 'SELECT',
};
const teamProperty: PageSchemaProperty = {
  config: defaultConfig,
  key: 'team',
  label: 'Team',
  options: asPropertyOptions('design', 'engineering'),
  required: false,
  type: 'MULTI_SELECT',
};
const doneProperty: PageSchemaProperty = {
  config: defaultConfig,
  key: 'done',
  label: 'Done',
  options: null,
  required: false,
  type: 'CHECKBOX',
};
const countProperty: PageSchemaProperty = {
  config: defaultConfig,
  key: 'count',
  label: 'Count',
  options: null,
  required: false,
  type: 'NUMBER',
};
const uniqueIdProperty: PageSchemaProperty = {
  config: { ...defaultConfig, prefix: 'TSK' },
  key: 'ticket',
  label: 'Ticket',
  options: null,
  required: false,
  type: 'UNIQUE_ID',
};
const percentProperty: PageSchemaProperty = {
  config: { ...defaultConfig, decimals: 1, numberFormat: 'PERCENT' },
  key: 'progress',
  label: 'Progress',
  options: null,
  required: false,
  type: 'NUMBER',
};
const relationProperty: PageSchemaProperty = {
  config: { ...defaultConfig, targetCollectionId: 'other' },
  key: 'related',
  label: 'Related',
  options: null,
  required: false,
  type: 'RELATION',
};
const filesProperty: PageSchemaProperty = {
  config: defaultConfig,
  key: 'files',
  label: 'Files',
  options: null,
  required: false,
  type: 'FILES',
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

  it('extracts a list value and falls back to an empty list', () => {
    expect(getListPropertyValue(['design'])).toEqual(['design']);
    expect(getListPropertyValue(undefined)).toEqual([]);
    expect(getListPropertyValue('design')).toEqual([]);
  });

  it('extracts a date value and falls back to nothing', () => {
    expect(getDatePropertyValue({ end: '2026-03-03', start: '2026-03-01' })).toEqual({
      end: '2026-03-03',
      start: '2026-03-01',
    });
    expect(getDatePropertyValue('2026-03-01')).toBeNull();
    expect(getDatePropertyValue(undefined)).toBeNull();
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

  it('shows a percent as a percent although it is stored as a fraction', () => {
    expect(formatPropertyValueForDisplay(percentProperty, 0.255)).toBe('25.5%');
  });

  it('shows a unique id with its prefix', () => {
    expect(formatPropertyValueForDisplay(uniqueIdProperty, 42)).toBe('TSK-42');
  });
});

describe('which properties a person can write', () => {
  it('edits what is typed or picked in the cell', () => {
    expect(isPropertyEditableInPlace(statusProperty)).toBe(true);
    expect(isPropertyEditableInPlace(relationProperty)).toBe(true);
  });

  it('never edits in the cell what the server fills or what is chosen among the row files', () => {
    expect(isPropertyEditableInPlace(uniqueIdProperty)).toBe(false);
    expect(isPropertyEditableInPlace(filesProperty)).toBe(false);
  });

  it('assigns one value to many rows only for what is typed or picked', () => {
    expect(isPropertyBulkAssignable(statusProperty)).toBe(true);
    expect(isPropertyBulkAssignable(relationProperty)).toBe(false);
    expect(isPropertyBulkAssignable(filesProperty)).toBe(false);
    expect(isPropertyBulkAssignable(uniqueIdProperty)).toBe(false);
  });

  it('leaves out of a summary what is held as an id', () => {
    expect(isPropertyReadableWithoutLookups(statusProperty)).toBe(true);
    expect(isPropertyReadableWithoutLookups(relationProperty)).toBe(false);
    expect(isPropertyReadableWithoutLookups(filesProperty)).toBe(false);
  });
});

describe('how a value opens', () => {
  it('opens a mail with its scheme and a phone without its spaces', () => {
    expect(readPropertyLinkHref('EMAIL', 'ada@example.com')).toBe('mailto:ada@example.com');
    expect(readPropertyLinkHref('PHONE', '+56 9 1234 5678')).toBe('tel:+56912345678');
    expect(readPropertyLinkHref('URL', 'https://example.com')).toBe('https://example.com');
  });

  it('joins names without leaving a gap for one that could not be resolved', () => {
    expect(joinPropertyNames(['Ada', '', 'Grace'])).toBe('Ada, Grace');
  });
});

describe('hasPersonProperty', () => {
  const assigneeProperty: PageSchemaProperty = {
    config: defaultConfig,
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

  it('reads an assignment as the name of the person', () => {
    expect(readPagePersonDisplayName(options, 'ada-id')).toBe('Ada Lovelace');
  });

  it('reads an assignment to a same-named person with the email that tells them apart', () => {
    expect(readPagePersonDisplayName(options, 'grace-id-2')).toBe('Grace Hopper (grace2@example.com)');
  });

  it('says nothing when nobody is assigned', () => {
    expect(readPagePersonDisplayName(options, '')).toBe('');
  });

  it('does not name someone the directory no longer knows, so the caller can say so in words', () => {
    expect(readPagePersonDisplayName(options, 'someone-who-left')).toBeNull();
  });

  it('says nothing while the directory has not arrived, rather than an identifier', () => {
    expect(readPagePersonDisplayName([], 'ada-id')).toBe('');
  });
});
