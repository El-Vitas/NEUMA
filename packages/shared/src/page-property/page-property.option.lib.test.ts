import { describe, expect, test } from 'bun:test';
import {
  assignPageOptionIds,
  createDefaultStatusOptions,
  findPageOption,
  hasEveryStatusGroupAnOption,
  pickDefaultStatusOption,
  pickPageOptionColor,
  readPagePropertyOptionDrafts,
  readPagePropertyOptions,
  sortPageOptionsByGroup,
} from './page-property.option.lib.js';
import { PAGE_OPTION_COLOR, PAGE_OPTION_COLOR_VALUES, PAGE_STATUS_GROUP } from './page-property.types.js';

const option = (id: string, value: string, group: 'COMPLETE' | 'IN_PROGRESS' | 'TO_DO' | null = null) => ({
  color: null,
  group,
  id,
  value,
});

describe('readPagePropertyOptions', () => {
  test('reads stored options with their id, color and group', () => {
    const stored = [
      { color: 'GREEN', group: 'COMPLETE', id: 'abcd1234', value: 'done' },
      { color: 'RED', id: 'efgh5678', value: 'blocked' },
    ];

    expect(readPagePropertyOptions(stored)).toEqual([
      { color: 'GREEN', group: 'COMPLETE', id: 'abcd1234', value: 'done' },
      { color: 'RED', group: null, id: 'efgh5678', value: 'blocked' },
    ]);
  });

  test('drops a color it does not know rather than trusting it into the page', () => {
    expect(readPagePropertyOptions([{ color: 'CHARTREUSE', id: 'abcd1234', value: 'todo' }])).toEqual([
      { color: null, group: null, id: 'abcd1234', value: 'todo' },
    ]);
  });

  test('drops a group it does not know', () => {
    expect(readPagePropertyOptions([{ group: 'LATER', id: 'abcd1234', value: 'todo' }])).toEqual([
      { color: null, group: null, id: 'abcd1234', value: 'todo' },
    ]);
  });

  test('has nothing to read from a property that defines no options', () => {
    expect(readPagePropertyOptions(null)).toBeNull();
    expect(readPagePropertyOptions(undefined)).toBeNull();
    expect(readPagePropertyOptions('todo')).toBeNull();
  });

  test('leaves out an entry without an id or a name', () => {
    expect(
      readPagePropertyOptions([{ color: 'RED', id: 'abcd1234' }, 'todo', 42, { id: 'efgh5678', value: 'ok' }]),
    ).toEqual([{ color: null, group: null, id: 'efgh5678', value: 'ok' }]);
  });
});

describe('readPagePropertyOptionDrafts', () => {
  test('keeps the id of an option that has one and leaves the new ones without', () => {
    expect(readPagePropertyOptionDrafts([{ id: 'abcd1234', value: 'todo' }, { value: 'new' }])).toEqual([
      { color: null, group: null, id: 'abcd1234', value: 'todo' },
      { color: null, group: null, id: null, value: 'new' },
    ]);
  });

  test('reads a plain list of names as new options', () => {
    expect(readPagePropertyOptionDrafts(['todo', 'done'])).toEqual([
      { color: null, group: null, id: null, value: 'todo' },
      { color: null, group: null, id: null, value: 'done' },
    ]);
  });

  test('has nothing to read from a property that defines no options', () => {
    expect(readPagePropertyOptionDrafts(undefined)).toBeNull();
  });
});

describe('assignPageOptionIds', () => {
  const sequence = (...ids: string[]) => {
    const queue = [...ids];
    return () => queue.shift() ?? 'zzzzzzzz';
  };

  test('keeps the id of an option the property already has', () => {
    const stored = [option('abcd1234', 'todo')];

    const assigned = assignPageOptionIds(
      [{ color: null, group: null, id: 'abcd1234', value: 'renamed' }],
      stored,
      sequence('nnnnnnnn'),
    );

    expect(assigned).toEqual([{ color: null, group: null, id: 'abcd1234', value: 'renamed' }]);
  });

  test('gives a new option an id of the server and never the one the client proposed', () => {
    const assigned = assignPageOptionIds(
      [{ color: null, group: null, id: 'proposed', value: 'new' }],
      [],
      sequence('nnnnnnnn'),
    );

    expect(assigned).toEqual([{ color: null, group: null, id: 'nnnnnnnn', value: 'new' }]);
  });

  test('draws again when an id is already taken in the property', () => {
    const assigned = assignPageOptionIds(
      [
        { color: null, group: null, id: 'abcd1234', value: 'kept' },
        { color: null, group: null, id: null, value: 'new' },
      ],
      [option('abcd1234', 'kept')],
      sequence('abcd1234', 'nnnnnnnn'),
    );

    expect(assigned.map((entry) => entry.id)).toEqual(['abcd1234', 'nnnnnnnn']);
  });
});

const countingIds = () => {
  let next = 0;
  return () => {
    next += 1;
    return `id${String(next).padStart(6, '0')}`;
  };
};

describe('status options', () => {
  test('starts a status with one option in each group, in the order they read', () => {
    const created = createDefaultStatusOptions(countingIds());

    expect(created.map((entry) => entry.group)).toEqual([
      PAGE_STATUS_GROUP.TO_DO,
      PAGE_STATUS_GROUP.IN_PROGRESS,
      PAGE_STATUS_GROUP.COMPLETE,
    ]);
  });

  test('picks the first to-do option as the default', () => {
    const options = [
      option('aaaaaaaa', 'doing', PAGE_STATUS_GROUP.IN_PROGRESS),
      option('bbbbbbbb', 'next', PAGE_STATUS_GROUP.TO_DO),
      option('cccccccc', 'later', PAGE_STATUS_GROUP.TO_DO),
    ];

    expect(pickDefaultStatusOption(options)?.id).toBe('bbbbbbbb');
  });

  test('has no default when there are no options', () => {
    expect(pickDefaultStatusOption([])).toBeNull();
  });

  test('requires every group to keep an option', () => {
    const complete = createDefaultStatusOptions(countingIds());

    expect(hasEveryStatusGroupAnOption(complete)).toBe(true);
    expect(hasEveryStatusGroupAnOption(complete.slice(0, 2))).toBe(false);
  });

  test('orders options by group and then by their position', () => {
    const options = [
      option('aaaaaaaa', 'done', PAGE_STATUS_GROUP.COMPLETE),
      option('bbbbbbbb', 'next', PAGE_STATUS_GROUP.TO_DO),
      option('cccccccc', 'doing', PAGE_STATUS_GROUP.IN_PROGRESS),
      option('dddddddd', 'later', PAGE_STATUS_GROUP.TO_DO),
    ];

    expect(sortPageOptionsByGroup(options).map((entry) => entry.id)).toEqual([
      'bbbbbbbb',
      'dddddddd',
      'cccccccc',
      'aaaaaaaa',
    ]);
  });
});

describe('findPageOption', () => {
  test('finds an option by its id', () => {
    expect(findPageOption([option('abcd1234', 'todo')], 'abcd1234')?.value).toBe('todo');
  });

  test('finds nothing for an id the property does not have', () => {
    expect(findPageOption([option('abcd1234', 'todo')], 'todo')).toBeNull();
    expect(findPageOption(null, 'abcd1234')).toBeNull();
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
