import { describe, expect, test } from 'bun:test';
import {
  pickPageOptionColor,
  readPagePropertyOptions,
  readPagePropertyOptionValues,
} from './page-property.option.lib.js';
import { PAGE_OPTION_COLOR, PAGE_OPTION_COLOR_VALUES } from './page-property.types.js';

describe('readPagePropertyOptions', () => {
  test('reads options that already carry a color', () => {
    const stored = [
      { color: 'GREEN', value: 'done' },
      { color: 'RED', value: 'blocked' },
    ];

    expect(readPagePropertyOptions(stored)).toEqual([
      { color: 'GREEN', value: 'done' },
      { color: 'RED', value: 'blocked' },
    ]);
  });

  test('reads a plain list of names as options without a color', () => {
    expect(readPagePropertyOptions(['todo', 'done'])).toEqual([
      { color: null, value: 'todo' },
      { color: null, value: 'done' },
    ]);
  });

  test('drops a color it does not know rather than trusting it into the page', () => {
    expect(readPagePropertyOptions([{ color: 'CHARTREUSE', value: 'todo' }])).toEqual([{ color: null, value: 'todo' }]);
  });

  test('has nothing to read from a property that defines no options', () => {
    expect(readPagePropertyOptions(null)).toBeNull();
    expect(readPagePropertyOptions(undefined)).toBeNull();
    expect(readPagePropertyOptions('todo')).toBeNull();
  });

  test('leaves out an entry that names no option', () => {
    expect(readPagePropertyOptions([{ color: 'RED' }, 'todo', 42])).toEqual([{ color: null, value: 'todo' }]);
  });
});

describe('readPagePropertyOptionValues', () => {
  test('gives the names alone, for whoever only needs to know what is allowed', () => {
    expect(readPagePropertyOptionValues([{ color: 'GREEN', value: 'done' }, 'todo'])).toEqual(['done', 'todo']);
  });

  test('gives nothing for a property that defines no options', () => {
    expect(readPagePropertyOptionValues(null)).toBeNull();
  });
});

describe('pickPageOptionColor', () => {
  test('gives every option of a list a color of its own while the palette lasts', () => {
    const colors = PAGE_OPTION_COLOR_VALUES.map((_, index) => pickPageOptionColor(index));

    expect(new Set(colors).size).toBe(PAGE_OPTION_COLOR_VALUES.length);
  });

  test('starts the palette over instead of running out', () => {
    expect(pickPageOptionColor(PAGE_OPTION_COLOR_VALUES.length)).toBe(PAGE_OPTION_COLOR.GRAY);
  });
});
