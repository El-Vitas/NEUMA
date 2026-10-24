import { describe, expect, it } from 'bun:test';
import { DatabasePropertyType, DatabaseViewType } from '@neuma/db';
import { DEFAULT_PAGE_PROPERTY_CONFIG, PAGE_STATUS_GROUP } from '@neuma/shared';
import {
  checkValuesAreWritableHere,
  keepFilesTheViewerMayName,
  listFileIds,
  pageCarriesSchema,
  resolveSchemaDrafts,
  validatePageProperties,
  validatePageSchemaDefinition,
  validatePageSchemaView,
  validatePageSchemaViews,
} from '@/modules/pages/domain/page-schema.domain';

const titleProperty = {
  config: DEFAULT_PAGE_PROPERTY_CONFIG,
  key: 'title',
  label: 'Title',
  type: DatabasePropertyType.TITLE,
  required: true,
  options: null,
};
const statusProperty = {
  config: DEFAULT_PAGE_PROPERTY_CONFIG,
  key: 'status',
  label: 'Status',
  type: DatabasePropertyType.SELECT,
  required: false,
  options: [
    { color: null, group: null, id: 'todo0001', value: 'todo' },
    { color: null, group: null, id: 'done0001', value: 'done' },
  ],
};

const fixedIds = (...ids: string[]) => {
  const queue = [...ids];
  return () => queue.shift() ?? 'zzzzzzzz';
};

describe('resolveSchemaDrafts', () => {
  const draft = (changes: object) => ({
    config: DEFAULT_PAGE_PROPERTY_CONFIG,
    key: 'status',
    label: 'Status',
    options: null,
    required: false,
    twoWay: false,
    type: DatabasePropertyType.SELECT,
    ...changes,
  });

  it('gives a new option the id of the server and keeps the id of one the property already has', () => {
    const resolved = resolveSchemaDrafts(
      [
        draft({
          options: [
            { color: null, group: null, id: 'todo0001', value: 'to do' },
            { color: null, group: null, id: null, value: 'later' },
          ],
        }),
      ],
      [statusProperty],
      fixedIds('new00001'),
    );

    expect(resolved[0]?.options?.map((option) => [option.id, option.value])).toEqual([
      ['todo0001', 'to do'],
      ['new00001', 'later'],
    ]);
  });

  it('starts a new status with an option in each group', () => {
    const resolved = resolveSchemaDrafts(
      [draft({ key: 'stage', options: null, type: DatabasePropertyType.STATUS })],
      [],
      fixedIds('aaaaaaa1', 'aaaaaaa2', 'aaaaaaa3'),
    );

    expect(resolved[0]?.options?.map((option) => option.group)).toEqual([
      PAGE_STATUS_GROUP.TO_DO,
      PAGE_STATUS_GROUP.IN_PROGRESS,
      PAGE_STATUS_GROUP.COMPLETE,
    ]);
  });

  it('leaves a type without options without any', () => {
    const resolved = resolveSchemaDrafts(
      [draft({ key: 'notes', type: DatabasePropertyType.RICH_TEXT })],
      [],
      fixedIds(),
    );

    expect(resolved[0]?.options).toBeNull();
  });

  it('does not carry the request for a mirror into the definition', () => {
    const resolved = resolveSchemaDrafts([draft({ twoWay: true })], [], fixedIds());

    expect('twoWay' in (resolved[0] ?? {})).toBe(false);
  });
});

describe('pageCarriesSchema', () => {
  it('is false for a page with no schema properties', () => {
    expect(pageCarriesSchema([])).toBe(false);
  });

  it('is true once a page has at least one schema property', () => {
    expect(pageCarriesSchema([titleProperty])).toBe(true);
  });
});

describe('validatePageSchemaDefinition', () => {
  it('requires exactly one TITLE property', () => {
    const result = validatePageSchemaDefinition([statusProperty]);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_SCHEMA_DEFINITION_INVALID');
  });

  it('accepts a well-formed set of properties', () => {
    const result = validatePageSchemaDefinition([titleProperty, statusProperty]);

    expect(result.isOk()).toBe(true);
  });
});

describe('validatePageSchemaView', () => {
  it('rejects a board view whose groupBy is not a SELECT property', () => {
    const result = validatePageSchemaView(
      { name: 'Board', type: DatabaseViewType.BOARD, configuration: { groupBy: 'title' }, isDefault: true },
      [titleProperty],
    );

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_SCHEMA_DEFINITION_INVALID');
  });

  it('accepts a board view whose groupBy references a SELECT property', () => {
    const result = validatePageSchemaView(
      { name: 'Board', type: DatabaseViewType.BOARD, configuration: { groupBy: 'status' }, isDefault: true },
      [titleProperty, statusProperty],
    );

    expect(result.isOk()).toBe(true);
  });
});

describe('validatePageSchemaViews', () => {
  it('rejects duplicate view names', () => {
    const result = validatePageSchemaViews(
      [
        { name: 'Board', type: DatabaseViewType.TABLE, configuration: {}, isDefault: true },
        { name: 'Board', type: DatabaseViewType.TABLE, configuration: {}, isDefault: false },
      ],
      [titleProperty],
    );

    expect(result.isFail()).toBe(true);
  });

  it('accepts a set of distinctly named, individually valid views', () => {
    const result = validatePageSchemaViews(
      [
        { name: 'Table', type: DatabaseViewType.TABLE, configuration: {}, isDefault: true },
        { name: 'Board', type: DatabaseViewType.BOARD, configuration: { groupBy: 'status' }, isDefault: false },
      ],
      [titleProperty, statusProperty],
    );

    expect(result.isOk()).toBe(true);
  });
});

describe('validatePageProperties — parent carries a schema', () => {
  const schemaProperties = [titleProperty, statusProperty];

  it('rejects values that violate the schema', () => {
    const result = validatePageProperties(schemaProperties, 'My Task', { status: 'blocked' });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_PROPERTY_INVALID');
  });

  it('accepts conforming values', () => {
    const result = validatePageProperties(schemaProperties, 'My Task', { status: 'todo0001' });

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toEqual({ status: 'todo0001' });
  });

  it('starts a new row on the first option of each status', () => {
    const stage = {
      ...statusProperty,
      key: 'stage',
      options: [
        { color: null, group: PAGE_STATUS_GROUP.TO_DO, id: 'next0001', value: 'Next' },
        { color: null, group: PAGE_STATUS_GROUP.IN_PROGRESS, id: 'doing001', value: 'Doing' },
        { color: null, group: PAGE_STATUS_GROUP.COMPLETE, id: 'done0001', value: 'Done' },
      ],
      type: DatabasePropertyType.STATUS,
    };

    const result = validatePageProperties([titleProperty, stage], 'My Task', null);

    expect(result.getValue()).toEqual({ stage: 'next0001' });
  });

  it('does not ask for a required property of a row that is only edited somewhere else', () => {
    const notes = {
      ...statusProperty,
      key: 'notes',
      options: null,
      required: true,
      type: DatabasePropertyType.RICH_TEXT,
    };

    const edited = validatePageProperties(
      [titleProperty, statusProperty, notes],
      'My Task',
      { status: 'todo0001' },
      {
        written: ['status'],
      },
    );
    const created = validatePageProperties([titleProperty, statusProperty, notes], 'My Task', { status: 'todo0001' });

    expect(edited.isOk()).toBe(true);
    expect(created.isFail()).toBe(true);
  });

  it('accepts a row with no optional values set', () => {
    const result = validatePageProperties(schemaProperties, 'My Task', null);

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toEqual({});
  });

  it('rejects the title property showing up inside propertyValues, since it is not duplicated there', () => {
    const result = validatePageProperties(schemaProperties, 'My Task', { title: 'Duplicate', status: 'todo0001' });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_PROPERTY_INVALID');
  });

  it('never stores the title key inside the returned property values', () => {
    const result = validatePageProperties(schemaProperties, 'My Task', { status: 'todo0001' });
    const value = result.getValue();

    expect(result.isOk()).toBe(true);
    expect(Object.keys(value ?? {})).not.toContain('title');
  });
});

describe('values that have their own way in', () => {
  const link = {
    ...statusProperty,
    config: { ...DEFAULT_PAGE_PROPERTY_CONFIG, targetCollectionId: 'projects' },
    key: 'project',
    options: null,
    type: DatabasePropertyType.RELATION,
  };
  const attachments = { ...statusProperty, key: 'attachments', options: null, type: DatabasePropertyType.FILES };
  const properties = [titleProperty, statusProperty, link, attachments];

  it('refuses a relation written as a value, because a relation is added or removed one row at a time', () => {
    expect(checkValuesAreWritableHere(properties, { project: ['row-1'] }).isFail()).toBe(true);
    expect(checkValuesAreWritableHere(properties, { status: 'todo0001' }).isOk()).toBe(true);
  });

  it('lists the files a write names, once', () => {
    expect(listFileIds(properties, { attachments: ['file-1', 'file-2'], status: 'todo0001' })).toEqual([
      'file-1',
      'file-2',
    ]);
    expect(listFileIds(properties, { status: 'todo0001' })).toEqual([]);
  });
});

describe('validatePageProperties — parent carries no schema', () => {
  it('rejects any property values at all', () => {
    const result = validatePageProperties([], 'A Plain Page', { status: 'todo' });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('PAGE_PROPERTY_INVALID');
  });

  it('accepts a page with no property values', () => {
    const result = validatePageProperties([], 'A Plain Page', null);

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toBeNull();
  });

  it('accepts a page with an explicit empty property values object', () => {
    const result = validatePageProperties([], 'A Plain Page', {});

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toBeNull();
  });
});

describe('keepFilesTheViewerMayName', () => {
  const files = [
    { id: 'own', ownerId: 'viewer', pageId: null },
    { id: 'row-file', ownerId: 'someone', pageId: 'row-1' },
    { id: 'other-row-file', ownerId: 'someone', pageId: 'row-9' },
    { id: 'orphan', ownerId: 'someone', pageId: null },
  ];

  it('keeps the files the viewer owns and the ones that belong to the rows being read, and no other', () => {
    expect(keepFilesTheViewerMayName(files, ['row-1'], 'viewer').map((file) => file.id)).toEqual(['own', 'row-file']);
  });
});
