import { describe, expect, test } from 'bun:test';
import { PAGE_PROPERTY_TYPE, PAGE_PROPERTY_TYPE_VALUES } from '../types/page-schema.types.js';
import { DEFAULT_PAGE_PROPERTY_CONFIG } from './page-property.config.lib.js';
import {
  canPagePropertyBeRequired,
  canPagePropertyGroupBoard,
  formatPagePropertyValue,
  getDefaultPagePropertyValue,
  getPagePropertyDefinition,
  humanizeSelectOption,
  isPagePropertySystemManaged,
  isPagePropertyValueEmpty,
  isTitlePageProperty,
  isValidPagePropertyValue,
  pagePropertyRequiresOptions,
  pagePropertyRequiresPersonDirectory,
} from './page-property.lib.js';
import type { PagePropertyContext } from './page-property.types.js';
import { PAGE_NUMBER_FORMAT, PAGE_PROPERTY_LOGICAL_TYPE, PAGE_STATUS_GROUP } from './page-property.types.js';

const emptyContext: PagePropertyContext = { config: DEFAULT_PAGE_PROPERTY_CONFIG, options: null, personIds: undefined };
const optionsContext: PagePropertyContext = {
  ...emptyContext,
  options: [
    { color: null, group: null, id: 'todo0001', value: 'to_do' },
    { color: null, group: null, id: 'doing001', value: 'doing' },
  ],
};
const statusContext: PagePropertyContext = {
  ...emptyContext,
  options: [
    { color: null, group: PAGE_STATUS_GROUP.IN_PROGRESS, id: 'doing001', value: 'Doing' },
    { color: null, group: PAGE_STATUS_GROUP.TO_DO, id: 'todo0001', value: 'Todo' },
    { color: null, group: PAGE_STATUS_GROUP.COMPLETE, id: 'done0001', value: 'Done' },
  ],
};
const personContext: PagePropertyContext = { ...emptyContext, personIds: new Set(['user-1', 'user-2']) };
const withConfig = (changes: Partial<typeof DEFAULT_PAGE_PROPERTY_CONFIG>): PagePropertyContext => ({
  ...emptyContext,
  config: { ...DEFAULT_PAGE_PROPERTY_CONFIG, ...changes },
});

describe('page property registry', () => {
  test('defines every property type exactly once', () => {
    const definedTypes = PAGE_PROPERTY_TYPE_VALUES.map((type) => getPagePropertyDefinition(type).type);

    expect(definedTypes).toEqual([...PAGE_PROPERTY_TYPE_VALUES]);
  });

  test('maps each property type to the logical type its filters will use', () => {
    const logicalTypeOf = (type: (typeof PAGE_PROPERTY_TYPE_VALUES)[number]) =>
      getPagePropertyDefinition(type).logicalType;

    expect(logicalTypeOf(PAGE_PROPERTY_TYPE.TITLE)).toBe(PAGE_PROPERTY_LOGICAL_TYPE.TEXT);
    expect(logicalTypeOf(PAGE_PROPERTY_TYPE.SELECT)).toBe(PAGE_PROPERTY_LOGICAL_TYPE.TAG);
    expect(logicalTypeOf(PAGE_PROPERTY_TYPE.PERSON)).toBe(PAGE_PROPERTY_LOGICAL_TYPE.MULTI_TAG);
    expect(logicalTypeOf(PAGE_PROPERTY_TYPE.MULTI_SELECT)).toBe(PAGE_PROPERTY_LOGICAL_TYPE.MULTI_TAG);
    expect(logicalTypeOf(PAGE_PROPERTY_TYPE.DATE)).toBe(PAGE_PROPERTY_LOGICAL_TYPE.DATE);
    expect(logicalTypeOf(PAGE_PROPERTY_TYPE.CHECKBOX)).toBe(PAGE_PROPERTY_LOGICAL_TYPE.BOOLEAN);
    expect(logicalTypeOf(PAGE_PROPERTY_TYPE.NUMBER)).toBe(PAGE_PROPERTY_LOGICAL_TYPE.NUMBER);
    expect(logicalTypeOf(PAGE_PROPERTY_TYPE.STATUS)).toBe(PAGE_PROPERTY_LOGICAL_TYPE.STATUS);
    expect(logicalTypeOf(PAGE_PROPERTY_TYPE.RELATION)).toBe(PAGE_PROPERTY_LOGICAL_TYPE.RELATION);
    expect(logicalTypeOf(PAGE_PROPERTY_TYPE.FILES)).toBe(PAGE_PROPERTY_LOGICAL_TYPE.FILES);
    expect(logicalTypeOf(PAGE_PROPERTY_TYPE.URL)).toBe(PAGE_PROPERTY_LOGICAL_TYPE.TEXT);
    expect(logicalTypeOf(PAGE_PROPERTY_TYPE.EMAIL)).toBe(PAGE_PROPERTY_LOGICAL_TYPE.TEXT);
    expect(logicalTypeOf(PAGE_PROPERTY_TYPE.PHONE)).toBe(PAGE_PROPERTY_LOGICAL_TYPE.TEXT);
    expect(logicalTypeOf(PAGE_PROPERTY_TYPE.CREATED_TIME)).toBe(PAGE_PROPERTY_LOGICAL_TYPE.DATE);
    expect(logicalTypeOf(PAGE_PROPERTY_TYPE.EDITED_TIME)).toBe(PAGE_PROPERTY_LOGICAL_TYPE.DATE);
    expect(logicalTypeOf(PAGE_PROPERTY_TYPE.CREATED_BY)).toBe(PAGE_PROPERTY_LOGICAL_TYPE.TAG);
    expect(logicalTypeOf(PAGE_PROPERTY_TYPE.EDITED_BY)).toBe(PAGE_PROPERTY_LOGICAL_TYPE.TAG);
    expect(logicalTypeOf(PAGE_PROPERTY_TYPE.UNIQUE_ID)).toBe(PAGE_PROPERTY_LOGICAL_TYPE.NUMBER);
  });
});

describe('page property capabilities', () => {
  test('the selection types and status carry options', () => {
    const typesRequiringOptions = PAGE_PROPERTY_TYPE_VALUES.filter(pagePropertyRequiresOptions);

    expect(typesRequiringOptions).toEqual([
      PAGE_PROPERTY_TYPE.SELECT,
      PAGE_PROPERTY_TYPE.MULTI_SELECT,
      PAGE_PROPERTY_TYPE.STATUS,
    ]);
  });

  test('only the person type needs the member directory', () => {
    const typesNeedingDirectory = PAGE_PROPERTY_TYPE_VALUES.filter(pagePropertyRequiresPersonDirectory);

    expect(typesNeedingDirectory).toEqual([PAGE_PROPERTY_TYPE.PERSON]);
  });

  // Free text is excluded (one column per answer). A row with several answers sits in a column for each (ADR 025).
  test('a board groups by whatever has a fixed set of answers, a day, a number or a state', () => {
    const groupableTypes = PAGE_PROPERTY_TYPE_VALUES.filter(canPagePropertyGroupBoard);

    expect(groupableTypes).toEqual([
      PAGE_PROPERTY_TYPE.SELECT,
      PAGE_PROPERTY_TYPE.MULTI_SELECT,
      PAGE_PROPERTY_TYPE.PERSON,
      PAGE_PROPERTY_TYPE.DATE,
      PAGE_PROPERTY_TYPE.CHECKBOX,
      PAGE_PROPERTY_TYPE.NUMBER,
      PAGE_PROPERTY_TYPE.STATUS,
      PAGE_PROPERTY_TYPE.CREATED_TIME,
      PAGE_PROPERTY_TYPE.EDITED_TIME,
    ]);
  });

  test('only the title type identifies the page', () => {
    const titleTypes = PAGE_PROPERTY_TYPE_VALUES.filter(isTitlePageProperty);

    expect(titleTypes).toEqual([PAGE_PROPERTY_TYPE.TITLE]);
  });

  test('the server fills creation, edition and the unique id', () => {
    const systemTypes = PAGE_PROPERTY_TYPE_VALUES.filter(isPagePropertySystemManaged);

    expect(systemTypes).toEqual([
      PAGE_PROPERTY_TYPE.CREATED_TIME,
      PAGE_PROPERTY_TYPE.EDITED_TIME,
      PAGE_PROPERTY_TYPE.CREATED_BY,
      PAGE_PROPERTY_TYPE.EDITED_BY,
      PAGE_PROPERTY_TYPE.UNIQUE_ID,
    ]);
  });

  test('required is offered for what can be left empty', () => {
    const requirable = PAGE_PROPERTY_TYPE_VALUES.filter(canPagePropertyBeRequired);

    expect(requirable).toEqual([
      PAGE_PROPERTY_TYPE.RICH_TEXT,
      PAGE_PROPERTY_TYPE.SELECT,
      PAGE_PROPERTY_TYPE.MULTI_SELECT,
      PAGE_PROPERTY_TYPE.PERSON,
      PAGE_PROPERTY_TYPE.DATE,
      PAGE_PROPERTY_TYPE.NUMBER,
      PAGE_PROPERTY_TYPE.RELATION,
      PAGE_PROPERTY_TYPE.URL,
      PAGE_PROPERTY_TYPE.EMAIL,
      PAGE_PROPERTY_TYPE.PHONE,
      PAGE_PROPERTY_TYPE.FILES,
    ]);
  });
});

describe('page property default values', () => {
  test('starts a multi select empty, a person empty and a checkbox unchecked', () => {
    expect(getDefaultPagePropertyValue(PAGE_PROPERTY_TYPE.MULTI_SELECT, emptyContext)).toEqual([]);
    expect(getDefaultPagePropertyValue(PAGE_PROPERTY_TYPE.PERSON, emptyContext)).toEqual([]);
    expect(getDefaultPagePropertyValue(PAGE_PROPERTY_TYPE.CHECKBOX, emptyContext)).toBe(false);
    expect(getDefaultPagePropertyValue(PAGE_PROPERTY_TYPE.NUMBER, emptyContext)).toBe(0);
  });

  test('starts a select on the id of its first option', () => {
    expect(getDefaultPagePropertyValue(PAGE_PROPERTY_TYPE.SELECT, optionsContext)).toBe('todo0001');
  });

  test('starts a select without options on an empty value', () => {
    expect(getDefaultPagePropertyValue(PAGE_PROPERTY_TYPE.SELECT, emptyContext)).toBe('');
  });

  test('starts a status on its first to-do option, wherever it sits in the list', () => {
    expect(getDefaultPagePropertyValue(PAGE_PROPERTY_TYPE.STATUS, statusContext)).toBe('todo0001');
  });

  test('starts every text-like property empty', () => {
    expect(getDefaultPagePropertyValue(PAGE_PROPERTY_TYPE.TITLE, emptyContext)).toBe('');
    expect(getDefaultPagePropertyValue(PAGE_PROPERTY_TYPE.RICH_TEXT, emptyContext)).toBe('');
    expect(getDefaultPagePropertyValue(PAGE_PROPERTY_TYPE.URL, emptyContext)).toBe('');
  });
});

describe('page property value validation', () => {
  test('requires a non-empty title within the allowed length', () => {
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.TITLE, 'Roadmap', emptyContext)).toBe(true);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.TITLE, '   ', emptyContext)).toBe(false);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.TITLE, 'a'.repeat(201), emptyContext)).toBe(false);
  });

  test('accepts any string as rich text', () => {
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.RICH_TEXT, '', emptyContext)).toBe(true);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.RICH_TEXT, 7, emptyContext)).toBe(false);
  });

  test('restricts a select to the ids of its declared options and never to their names', () => {
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.SELECT, 'todo0001', optionsContext)).toBe(true);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.SELECT, 'to_do', optionsContext)).toBe(false);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.SELECT, 'nothere1', optionsContext)).toBe(false);
  });

  test('restricts a multi select to unique declared ids', () => {
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.MULTI_SELECT, ['todo0001', 'doing001'], optionsContext)).toBe(
      true,
    );
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.MULTI_SELECT, ['todo0001', 'todo0001'], optionsContext)).toBe(
      false,
    );
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.MULTI_SELECT, ['nothere1'], optionsContext)).toBe(false);
  });

  test('restricts a status to the ids of its options', () => {
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.STATUS, 'done0001', statusContext)).toBe(true);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.STATUS, 'Done', statusContext)).toBe(false);
  });

  test('restricts a person to a list of known members, one unless the property allows more', () => {
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.PERSON, ['user-1'], personContext)).toBe(true);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.PERSON, ['user-3'], personContext)).toBe(false);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.PERSON, ['user-1'], emptyContext)).toBe(false);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.PERSON, 'user-1', personContext)).toBe(false);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.PERSON, ['user-1', 'user-2'], personContext)).toBe(false);
  });

  test('lets a person property that allows several name them without repeating one', () => {
    const several = { ...personContext, config: { ...DEFAULT_PAGE_PROPERTY_CONFIG, allowsMultiple: true } };

    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.PERSON, ['user-1', 'user-2'], several)).toBe(true);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.PERSON, ['user-1', 'user-1'], several)).toBe(false);
  });

  test('requires a date or a range, and refuses a bare string', () => {
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.DATE, { start: '2026-08-11' }, emptyContext)).toBe(true);
    expect(
      isValidPagePropertyValue(PAGE_PROPERTY_TYPE.DATE, { end: '2026-08-12', start: '2026-08-11' }, emptyContext),
    ).toBe(true);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.DATE, { start: 'not a date' }, emptyContext)).toBe(false);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.DATE, '2026-08-11', emptyContext)).toBe(false);
  });

  test('requires a finite number with no more decimals than configured', () => {
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.NUMBER, 42, emptyContext)).toBe(true);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.NUMBER, Number.POSITIVE_INFINITY, emptyContext)).toBe(false);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.NUMBER, '42', emptyContext)).toBe(false);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.NUMBER, 1.5, withConfig({ decimals: 0 }))).toBe(false);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.NUMBER, 1.5, withConfig({ decimals: 1 }))).toBe(true);
    expect(
      isValidPagePropertyValue(
        PAGE_PROPERTY_TYPE.NUMBER,
        0.255,
        withConfig({ decimals: 1, numberFormat: PAGE_NUMBER_FORMAT.PERCENT }),
      ),
    ).toBe(true);
  });

  test('requires a boolean checkbox', () => {
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.CHECKBOX, false, emptyContext)).toBe(true);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.CHECKBOX, 'false', emptyContext)).toBe(false);
  });

  test('requires well-formed urls, emails and phones, and lets them be empty', () => {
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.URL, 'https://neuma.example', emptyContext)).toBe(true);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.URL, 'neuma.example', emptyContext)).toBe(false);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.EMAIL, 'ana@neuma.example', emptyContext)).toBe(true);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.EMAIL, 'ana', emptyContext)).toBe(false);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.PHONE, '+56 9 1234 5678', emptyContext)).toBe(true);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.PHONE, 'abc', emptyContext)).toBe(false);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.URL, '', emptyContext)).toBe(true);
  });

  test('requires a relation to be a list of unique row ids within the limit', () => {
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.RELATION, ['row-1', 'row-2'], emptyContext)).toBe(true);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.RELATION, ['row-1', 'row-1'], emptyContext)).toBe(false);
    expect(
      isValidPagePropertyValue(
        PAGE_PROPERTY_TYPE.RELATION,
        Array.from({ length: 101 }, (_, index) => `row-${String(index)}`),
        emptyContext,
      ),
    ).toBe(false);
  });

  test('allows ten files at most', () => {
    const files = (count: number) => Array.from({ length: count }, (_, index) => `file-${String(index)}`);

    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.FILES, files(10), emptyContext)).toBe(true);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.FILES, files(11), emptyContext)).toBe(false);
  });

  test('refuses any value the server alone writes', () => {
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.CREATED_TIME, { start: '2026-08-11' }, emptyContext)).toBe(
      false,
    );
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.EDITED_BY, 'user-1', personContext)).toBe(false);
  });

  test('a stored unique id is a positive whole number', () => {
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.UNIQUE_ID, 12, emptyContext)).toBe(true);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.UNIQUE_ID, 0, emptyContext)).toBe(false);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.UNIQUE_ID, 1.5, emptyContext)).toBe(false);
  });
});

describe('page property emptiness', () => {
  test('a missing value is empty for every type', () => {
    expect(isPagePropertyValueEmpty(PAGE_PROPERTY_TYPE.URL, undefined)).toBe(true);
  });

  test('says what empty means for each shape', () => {
    expect(isPagePropertyValueEmpty(PAGE_PROPERTY_TYPE.RICH_TEXT, '   ')).toBe(true);
    expect(isPagePropertyValueEmpty(PAGE_PROPERTY_TYPE.PERSON, [])).toBe(true);
    expect(isPagePropertyValueEmpty(PAGE_PROPERTY_TYPE.RELATION, ['row-1'])).toBe(false);
    expect(isPagePropertyValueEmpty(PAGE_PROPERTY_TYPE.DATE, { start: '2026-08-11' })).toBe(false);
    expect(isPagePropertyValueEmpty(PAGE_PROPERTY_TYPE.CHECKBOX, false)).toBe(false);
  });
});

describe('page property display', () => {
  test('replaces underscores and hyphens with spaces and capitalizes the first letter', () => {
    expect(humanizeSelectOption('in_progress')).toBe('In progress');
    expect(humanizeSelectOption('high-priority')).toBe('High priority');
  });

  test('capitalizes a single-word option', () => {
    expect(humanizeSelectOption('done')).toBe('Done');
  });

  test('works for options nobody anticipated', () => {
    expect(humanizeSelectOption('AWAITING_CUSTOMER_REPLY')).toBe('Awaiting customer reply');
  });

  test('returns an empty string for an empty option', () => {
    expect(humanizeSelectOption('')).toBe('');
  });

  test('shows the name of the option a row stores the id of', () => {
    expect(formatPagePropertyValue(PAGE_PROPERTY_TYPE.SELECT, 'todo0001', optionsContext)).toBe('To do');
    expect(formatPagePropertyValue(PAGE_PROPERTY_TYPE.MULTI_SELECT, ['todo0001', 'doing001'], optionsContext)).toBe(
      'To do, Doing',
    );
  });

  test('shows nothing for an id the property no longer has', () => {
    expect(formatPagePropertyValue(PAGE_PROPERTY_TYPE.SELECT, 'gone0000', optionsContext)).toBe('');
  });

  test('shows a range with an arrow and a unique id with its prefix', () => {
    expect(
      formatPagePropertyValue(PAGE_PROPERTY_TYPE.DATE, { end: '2026-08-12', start: '2026-08-11' }, emptyContext),
    ).toBe('2026-08-11 → 2026-08-12');
    expect(formatPagePropertyValue(PAGE_PROPERTY_TYPE.UNIQUE_ID, 7, withConfig({ prefix: 'TSK' }))).toBe('TSK-7');
    expect(formatPagePropertyValue(PAGE_PROPERTY_TYPE.UNIQUE_ID, 7, emptyContext)).toBe('7');
  });

  test('renders the remaining types as plain text', () => {
    expect(formatPagePropertyValue(PAGE_PROPERTY_TYPE.NUMBER, 42, emptyContext)).toBe('42');
    expect(formatPagePropertyValue(PAGE_PROPERTY_TYPE.CHECKBOX, true, emptyContext)).toBe('true');
    expect(formatPagePropertyValue(PAGE_PROPERTY_TYPE.RICH_TEXT, 'notes', emptyContext)).toBe('notes');
  });
});
