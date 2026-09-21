import { describe, expect, test } from 'bun:test';
import { PAGE_PROPERTY_TYPE, PAGE_PROPERTY_TYPE_VALUES } from '../types/page-schema.types.js';
import {
  canPagePropertyGroupBoard,
  formatPagePropertyValue,
  getDefaultPagePropertyValue,
  getPagePropertyDefinition,
  humanizeSelectOption,
  isTitlePageProperty,
  isValidPagePropertyValue,
  pagePropertyRequiresOptions,
  pagePropertyRequiresPersonDirectory,
} from './page-property.lib.js';
import { PAGE_PROPERTY_LOGICAL_TYPE } from './page-property.types.js';

const emptyContext = { options: null, personIds: undefined };
const statusContext = { options: ['todo', 'doing'], personIds: undefined };
const personContext = { options: null, personIds: new Set(['user-1']) };

describe('page property registry', () => {
  test('defines every property type exactly once', () => {
    const definedTypes = PAGE_PROPERTY_TYPE_VALUES.map((type) => getPagePropertyDefinition(type).type);

    expect(definedTypes).toEqual([...PAGE_PROPERTY_TYPE_VALUES]);
  });

  test('maps each property type to the logical type its filters will use', () => {
    expect(getPagePropertyDefinition(PAGE_PROPERTY_TYPE.TITLE).logicalType).toBe(PAGE_PROPERTY_LOGICAL_TYPE.TEXT);
    expect(getPagePropertyDefinition(PAGE_PROPERTY_TYPE.RICH_TEXT).logicalType).toBe(PAGE_PROPERTY_LOGICAL_TYPE.TEXT);
    expect(getPagePropertyDefinition(PAGE_PROPERTY_TYPE.SELECT).logicalType).toBe(PAGE_PROPERTY_LOGICAL_TYPE.TAG);
    expect(getPagePropertyDefinition(PAGE_PROPERTY_TYPE.PERSON).logicalType).toBe(PAGE_PROPERTY_LOGICAL_TYPE.TAG);
    expect(getPagePropertyDefinition(PAGE_PROPERTY_TYPE.MULTI_SELECT).logicalType).toBe(
      PAGE_PROPERTY_LOGICAL_TYPE.MULTI_TAG,
    );
    expect(getPagePropertyDefinition(PAGE_PROPERTY_TYPE.DATE).logicalType).toBe(PAGE_PROPERTY_LOGICAL_TYPE.DATE);
    expect(getPagePropertyDefinition(PAGE_PROPERTY_TYPE.CHECKBOX).logicalType).toBe(PAGE_PROPERTY_LOGICAL_TYPE.BOOLEAN);
    expect(getPagePropertyDefinition(PAGE_PROPERTY_TYPE.NUMBER).logicalType).toBe(PAGE_PROPERTY_LOGICAL_TYPE.NUMBER);
  });
});

describe('page property capabilities', () => {
  test('only the selection types carry options', () => {
    const typesRequiringOptions = PAGE_PROPERTY_TYPE_VALUES.filter(pagePropertyRequiresOptions);

    expect(typesRequiringOptions).toEqual([PAGE_PROPERTY_TYPE.SELECT, PAGE_PROPERTY_TYPE.MULTI_SELECT]);
  });

  test('only the person type needs the member directory', () => {
    const typesNeedingDirectory = PAGE_PROPERTY_TYPE_VALUES.filter(pagePropertyRequiresPersonDirectory);

    expect(typesNeedingDirectory).toEqual([PAGE_PROPERTY_TYPE.PERSON]);
  });

  /**
   * Una columna es un valor, así que agrupa lo que responda un valor y solo
   * uno. Queda fuera el texto libre, que haría una columna por respuesta, y la
   * selección múltiple, que pondría la misma fila en varias a la vez.
   */
  test('a board groups by whatever answers with a single value', () => {
    const groupableTypes = PAGE_PROPERTY_TYPE_VALUES.filter(canPagePropertyGroupBoard);

    expect(groupableTypes).toEqual([
      PAGE_PROPERTY_TYPE.SELECT,
      PAGE_PROPERTY_TYPE.DATE,
      PAGE_PROPERTY_TYPE.CHECKBOX,
      PAGE_PROPERTY_TYPE.NUMBER,
    ]);
  });

  test('only the title type identifies the page', () => {
    const titleTypes = PAGE_PROPERTY_TYPE_VALUES.filter(isTitlePageProperty);

    expect(titleTypes).toEqual([PAGE_PROPERTY_TYPE.TITLE]);
  });
});

describe('page property default values', () => {
  test('starts a multi select empty and a checkbox unchecked', () => {
    expect(getDefaultPagePropertyValue(PAGE_PROPERTY_TYPE.MULTI_SELECT, emptyContext)).toEqual([]);
    expect(getDefaultPagePropertyValue(PAGE_PROPERTY_TYPE.CHECKBOX, emptyContext)).toBe(false);
    expect(getDefaultPagePropertyValue(PAGE_PROPERTY_TYPE.NUMBER, emptyContext)).toBe(0);
  });

  test('starts a select on its first option', () => {
    expect(getDefaultPagePropertyValue(PAGE_PROPERTY_TYPE.SELECT, statusContext)).toBe('todo');
  });

  test('starts a select without options on an empty value', () => {
    expect(getDefaultPagePropertyValue(PAGE_PROPERTY_TYPE.SELECT, emptyContext)).toBe('');
  });

  test('starts every text-like property empty', () => {
    expect(getDefaultPagePropertyValue(PAGE_PROPERTY_TYPE.TITLE, emptyContext)).toBe('');
    expect(getDefaultPagePropertyValue(PAGE_PROPERTY_TYPE.RICH_TEXT, emptyContext)).toBe('');
    expect(getDefaultPagePropertyValue(PAGE_PROPERTY_TYPE.DATE, emptyContext)).toBe('');
    expect(getDefaultPagePropertyValue(PAGE_PROPERTY_TYPE.PERSON, emptyContext)).toBe('');
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

  test('restricts a select to its declared options', () => {
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.SELECT, 'todo', statusContext)).toBe(true);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.SELECT, 'done', statusContext)).toBe(false);
  });

  test('restricts a multi select to unique declared options', () => {
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.MULTI_SELECT, ['todo', 'doing'], statusContext)).toBe(true);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.MULTI_SELECT, ['todo', 'todo'], statusContext)).toBe(false);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.MULTI_SELECT, ['done'], statusContext)).toBe(false);
  });

  test('restricts a person to the known member directory', () => {
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.PERSON, 'user-1', personContext)).toBe(true);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.PERSON, 'user-2', personContext)).toBe(false);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.PERSON, 'user-1', emptyContext)).toBe(false);
  });

  test('requires a parseable date', () => {
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.DATE, '2026-08-11', emptyContext)).toBe(true);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.DATE, 'not a date', emptyContext)).toBe(false);
  });

  test('requires a finite number', () => {
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.NUMBER, 42, emptyContext)).toBe(true);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.NUMBER, Number.POSITIVE_INFINITY, emptyContext)).toBe(false);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.NUMBER, '42', emptyContext)).toBe(false);
  });

  test('requires a boolean checkbox', () => {
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.CHECKBOX, false, emptyContext)).toBe(true);
    expect(isValidPagePropertyValue(PAGE_PROPERTY_TYPE.CHECKBOX, 'false', emptyContext)).toBe(false);
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

  test('humanizes every option of a multi select', () => {
    expect(formatPagePropertyValue(PAGE_PROPERTY_TYPE.MULTI_SELECT, ['in_progress', 'done'])).toBe('In progress, Done');
  });

  test('renders the remaining types as plain text', () => {
    expect(formatPagePropertyValue(PAGE_PROPERTY_TYPE.NUMBER, 42)).toBe('42');
    expect(formatPagePropertyValue(PAGE_PROPERTY_TYPE.CHECKBOX, true)).toBe('true');
    expect(formatPagePropertyValue(PAGE_PROPERTY_TYPE.RICH_TEXT, 'notes')).toBe('notes');
  });
});
