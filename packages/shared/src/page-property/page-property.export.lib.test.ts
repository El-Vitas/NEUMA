import { describe, expect, test } from 'bun:test';
import type { PagePropertyType } from '../types/page-schema.types.js';
import { PAGE_PROPERTY_TYPE } from '../types/page-schema.types.js';
import { DEFAULT_PAGE_PROPERTY_CONFIG } from './page-property.config.lib.js';
import { withPageDerivedValues } from './page-property.derived.lib.js';
import type { PageNameLookup } from './page-property.export.lib.js';
import { toPageExportText } from './page-property.export.lib.js';
import type { PagePropertyConfig, PagePropertyOption, PagePropertyValue } from './page-property.types.js';
import { PAGE_NUMBER_FORMAT, PAGE_STATUS_GROUP } from './page-property.types.js';

const options: readonly PagePropertyOption[] = [
  { color: null, group: PAGE_STATUS_GROUP.TO_DO, id: 'todo0001', value: 'in_progress' },
  { color: null, group: PAGE_STATUS_GROUP.COMPLETE, id: 'done0001', value: 'Done' },
];

const names: PageNameLookup = {
  files: new Map([['file-1', 'plan.pdf']]),
  people: new Map([
    ['user-1', 'Ana'],
    ['user-2', 'Beto'],
  ]),
  rows: new Map([['row-1', 'Launch']]),
};

const textOf = (
  type: PagePropertyType,
  value: PagePropertyValue | undefined,
  config: Partial<PagePropertyConfig> = {},
): string => toPageExportText({ config: { ...DEFAULT_PAGE_PROPERTY_CONFIG, ...config }, options, type }, value, names);

describe('toPageExportText', () => {
  test('writes the name of an option, as it was typed, not its id', () => {
    expect(textOf(PAGE_PROPERTY_TYPE.SELECT, 'todo0001')).toBe('in_progress');
    expect(textOf(PAGE_PROPERTY_TYPE.STATUS, 'done0001')).toBe('Done');
    expect(textOf(PAGE_PROPERTY_TYPE.MULTI_SELECT, ['todo0001', 'done0001'])).toBe('in_progress, Done');
  });

  test('writes nothing for an option the property no longer has', () => {
    expect(textOf(PAGE_PROPERTY_TYPE.SELECT, 'gone0000')).toBe('');
  });

  test('writes people by name, leaving out whoever the directory does not know', () => {
    expect(textOf(PAGE_PROPERTY_TYPE.PERSON, ['user-1', 'user-2'])).toBe('Ana, Beto');
    expect(textOf(PAGE_PROPERTY_TYPE.PERSON, ['user-1', 'user-9'])).toBe('Ana');
    expect(textOf(PAGE_PROPERTY_TYPE.CREATED_BY, 'user-2')).toBe('Beto');
  });

  test('writes a day, a range and an instant', () => {
    expect(textOf(PAGE_PROPERTY_TYPE.DATE, { start: '2026-10-20' })).toBe('2026-10-20');
    expect(textOf(PAGE_PROPERTY_TYPE.DATE, { end: '2026-10-25', start: '2026-10-20' })).toBe('2026-10-20 → 2026-10-25');
    expect(textOf(PAGE_PROPERTY_TYPE.CREATED_TIME, { start: '2026-10-20T09:00:00.000Z' })).toBe(
      '2026-10-20T09:00:00.000Z',
    );
  });

  test('writes a number with the format of the property', () => {
    expect(textOf(PAGE_PROPERTY_TYPE.NUMBER, 0.25, { numberFormat: PAGE_NUMBER_FORMAT.PERCENT })).toBe('25%');
    expect(
      textOf(PAGE_PROPERTY_TYPE.NUMBER, 1500, {
        currency: 'CLP',
        decimals: 0,
        numberFormat: PAGE_NUMBER_FORMAT.CURRENCY,
      }),
    ).toBe('CLP 1500');
  });

  test('writes a unique id with its prefix', () => {
    expect(textOf(PAGE_PROPERTY_TYPE.UNIQUE_ID, 7, { prefix: 'TSK' })).toBe('TSK-7');
  });

  test('writes the titles of the rows a relation points to and the names of the files', () => {
    expect(textOf(PAGE_PROPERTY_TYPE.RELATION, ['row-1', 'row-hidden'])).toBe('Launch');
    expect(textOf(PAGE_PROPERTY_TYPE.FILES, ['file-1'])).toBe('plan.pdf');
  });

  test('writes the rest as plain text', () => {
    expect(textOf(PAGE_PROPERTY_TYPE.URL, 'https://neuma.example')).toBe('https://neuma.example');
    expect(textOf(PAGE_PROPERTY_TYPE.CHECKBOX, false)).toBe('false');
  });

  test('writes nothing for a value that is missing', () => {
    expect(textOf(PAGE_PROPERTY_TYPE.NUMBER, undefined)).toBe('');
  });
});

describe('withPageDerivedValues', () => {
  const properties = [
    { key: 'title', type: PAGE_PROPERTY_TYPE.TITLE },
    { key: 'born', type: PAGE_PROPERTY_TYPE.CREATED_TIME },
    { key: 'touched', type: PAGE_PROPERTY_TYPE.EDITED_TIME },
    { key: 'author', type: PAGE_PROPERTY_TYPE.CREATED_BY },
    { key: 'editor', type: PAGE_PROPERTY_TYPE.EDITED_BY },
  ] as const;
  const authorship = {
    createdAt: '2026-10-01T10:00:00.000Z',
    createdById: 'user-1',
    editedAt: '2026-10-02T10:00:00.000Z',
    editedById: 'user-2',
  };

  test('reads creation and edition from the columns of the block and keeps what the row stores', () => {
    expect(withPageDerivedValues(properties, { title: 'Row' }, authorship)).toEqual({
      author: 'user-1',
      born: { start: '2026-10-01T10:00:00.000Z' },
      editor: 'user-2',
      title: 'Row',
      touched: { start: '2026-10-02T10:00:00.000Z' },
    });
  });

  test('never lets a stored value pass for a derived one', () => {
    expect(withPageDerivedValues(properties, { author: 'user-9' }, authorship).author).toBe('user-1');
  });
});
