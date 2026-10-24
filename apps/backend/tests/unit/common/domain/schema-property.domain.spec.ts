import { describe, expect, it } from 'bun:test';
import { DatabasePropertyType } from '@neuma/db';
import { DEFAULT_PAGE_PROPERTY_CONFIG, PAGE_STATUS_GROUP } from '@neuma/shared';
import type { SchemaPropertyDefinition } from '@/common/domain/schema.domain.types';
import {
  fillStatusDefaults,
  validateSchemaProperties,
  validateSchemaPropertyValues,
} from '@/common/domain/schema-property.domain';

const property = (changes: Partial<SchemaPropertyDefinition> & Pick<SchemaPropertyDefinition, 'key' | 'type'>) => ({
  config: DEFAULT_PAGE_PROPERTY_CONFIG,
  label: changes.key,
  options: null,
  required: false,
  ...changes,
});

const title = property({ key: 'title', required: true, type: DatabasePropertyType.TITLE });

const stage = property({
  key: 'stage',
  options: [
    { color: null, group: PAGE_STATUS_GROUP.TO_DO, id: 'next0001', value: 'Next' },
    { color: null, group: PAGE_STATUS_GROUP.IN_PROGRESS, id: 'doing001', value: 'Doing' },
    { color: null, group: PAGE_STATUS_GROUP.COMPLETE, id: 'done0001', value: 'Done' },
  ],
  type: DatabasePropertyType.STATUS,
});

describe('schema property domain validation', () => {
  it('rejects duplicate property keys before persistence', () => {
    const result = validateSchemaProperties([
      title,
      property({ key: 'title', label: 'Other title', type: DatabasePropertyType.RICH_TEXT }),
    ]);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('SCHEMA_PROPERTY_DEFINITION_INVALID');
  });

  it('requires exactly one TITLE property', () => {
    const result = validateSchemaProperties([
      property({
        key: 'status',
        options: [{ color: null, group: null, id: 'todo0001', value: 'todo' }],
        type: DatabasePropertyType.SELECT,
      }),
    ]);

    expect(result.isFail()).toBe(true);
  });

  // A freshly created select has no options yet; requiring one to save would force inventing one.
  it('accepts a selection that does not offer anything yet', () => {
    const result = validateSchemaProperties([
      title,
      property({ key: 'status', options: [], type: DatabasePropertyType.SELECT }),
    ]);

    expect(result.isOk()).toBe(true);
  });

  it('still refuses two options that say the same thing', () => {
    const result = validateSchemaProperties([
      title,
      property({
        key: 'status',
        options: [
          { color: null, group: null, id: 'todo0001', value: 'todo' },
          { color: null, group: null, id: 'todo0002', value: 'todo' },
        ],
        type: DatabasePropertyType.SELECT,
      }),
    ]);

    expect(result.isFail()).toBe(true);
  });

  it('refuses two options with the same id, because a row could not tell them apart', () => {
    const result = validateSchemaProperties([
      title,
      property({
        key: 'status',
        options: [
          { color: null, group: null, id: 'todo0001', value: 'todo' },
          { color: null, group: null, id: 'todo0001', value: 'done' },
        ],
        type: DatabasePropertyType.SELECT,
      }),
    ]);

    expect(result.isFail()).toBe(true);
  });

  it('refuses an option whose id is not one the server could have given', () => {
    const result = validateSchemaProperties([
      title,
      property({
        key: 'status',
        options: [{ color: null, group: null, id: 'Not An Id', value: 'todo' }],
        type: DatabasePropertyType.SELECT,
      }),
    ]);

    expect(result.isFail()).toBe(true);
  });

  it('accepts a status with an option in each group', () => {
    expect(validateSchemaProperties([title, stage]).isOk()).toBe(true);
  });

  it('refuses a status that leaves a group without an option', () => {
    const result = validateSchemaProperties([
      title,
      property({ ...stage, options: (stage.options ?? []).slice(0, 2) }),
    ]);

    expect(result.isFail()).toBe(true);
  });

  it('refuses a group on an option of anything but a status', () => {
    const result = validateSchemaProperties([
      title,
      property({
        key: 'status',
        options: [{ color: null, group: PAGE_STATUS_GROUP.TO_DO, id: 'todo0001', value: 'todo' }],
        type: DatabasePropertyType.SELECT,
      }),
    ]);

    expect(result.isFail()).toBe(true);
  });

  it('refuses a configuration the type does not use', () => {
    const result = validateSchemaProperties([
      title,
      property({
        config: { ...DEFAULT_PAGE_PROPERTY_CONFIG, prefix: 'TSK' },
        key: 'notes',
        type: DatabasePropertyType.RICH_TEXT,
      }),
    ]);

    expect(result.isFail()).toBe(true);
  });

  it('refuses a currency number without its currency', () => {
    const result = validateSchemaProperties([
      title,
      property({
        config: { ...DEFAULT_PAGE_PROPERTY_CONFIG, numberFormat: 'CURRENCY' },
        key: 'budget',
        type: DatabasePropertyType.NUMBER,
      }),
    ]);

    expect(result.isFail()).toBe(true);
  });

  it('refuses to require what always has a value or is filled by the server', () => {
    const asRequired = (key: string, type: DatabasePropertyType) =>
      validateSchemaProperties([
        title,
        property({ ...stage, required: false }),
        property({ key, required: true, type }),
      ]);

    expect(asRequired('done', DatabasePropertyType.CHECKBOX).isFail()).toBe(true);
    expect(asRequired('code', DatabasePropertyType.UNIQUE_ID).isFail()).toBe(true);
    expect(asRequired('born', DatabasePropertyType.CREATED_TIME).isFail()).toBe(true);
    expect(asRequired('link', DatabasePropertyType.URL).isOk()).toBe(true);
  });
});

describe('schema property value validation', () => {
  const selectable = property({
    key: 'status',
    options: [
      { color: null, group: null, id: 'todo0001', value: 'todo' },
      { color: null, group: null, id: 'done0001', value: 'done' },
    ],
    type: DatabasePropertyType.SELECT,
  });

  it('rejects values that do not match their configured property types', () => {
    const result = validateSchemaPropertyValues([title, selectable], { title: 'Task', status: 'blocked' });

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('SCHEMA_PROPERTY_VALUE_INVALID');
  });

  it('accepts the id of an option and refuses its name', () => {
    expect(validateSchemaPropertyValues([title, selectable], { title: 'Task', status: 'todo0001' }).isOk()).toBe(true);
    expect(validateSchemaPropertyValues([title, selectable], { title: 'Task', status: 'todo' }).isFail()).toBe(true);
  });

  it('accepts configured values and rejects unknown keys', () => {
    const result = validateSchemaPropertyValues([title], { title: 'Task', unknown: true });

    expect(result.isFail()).toBe(true);
  });

  it('refuses a write to what the server fills', () => {
    const properties = [title, property({ key: 'code', type: DatabasePropertyType.UNIQUE_ID })];

    const written = validateSchemaPropertyValues(properties, { code: 5, title: 'Task' }, { written: ['code'] });

    expect(written.isFail()).toBe(true);
  });

  it('keeps a number the server gave a row when another property is edited', () => {
    const properties = [
      title,
      property({ key: 'code', type: DatabasePropertyType.UNIQUE_ID }),
      property({ key: 'notes', type: DatabasePropertyType.RICH_TEXT }),
    ];

    const edited = validateSchemaPropertyValues(
      properties,
      { code: 5, notes: 'x', title: 'Task' },
      { written: ['notes'] },
    );

    expect(edited.isOk()).toBe(true);
  });

  it('refuses a person list over one when the property allows one', () => {
    const properties = [title, property({ key: 'owner', type: DatabasePropertyType.PERSON })];

    const result = validateSchemaPropertyValues(
      properties,
      { owner: ['user-1', 'user-2'], title: 'Task' },
      { personIds: new Set(['user-1', 'user-2']) },
    );

    expect(result.isFail()).toBe(true);
  });
});

describe('schema property value validation, status', () => {
  it('refuses to clear a status, which always has a value', () => {
    const cleared = validateSchemaPropertyValues([title, stage], { title: 'Task' }, { written: ['stage'] });
    const untouched = validateSchemaPropertyValues([title, stage], { title: 'Task' }, { written: [] });

    expect(cleared.isFail()).toBe(true);
    expect(untouched.isOk()).toBe(true);
  });
});

describe('schema property value validation, required properties', () => {
  const required = property({ key: 'notes', required: true, type: DatabasePropertyType.RICH_TEXT });

  it('asks for every required property when the row is created', () => {
    expect(validateSchemaPropertyValues([title, required], { title: 'Task' }).isFail()).toBe(true);
    expect(validateSchemaPropertyValues([title, required], { notes: 'x', title: 'Task' }).isOk()).toBe(true);
  });

  it('does not stop the edit of another property in a row that never had the value', () => {
    const other = property({ key: 'link', type: DatabasePropertyType.URL });

    const result = validateSchemaPropertyValues(
      [title, required, other],
      { link: 'https://neuma.example', title: 'Task' },
      { written: ['link'] },
    );

    expect(result.isOk()).toBe(true);
  });

  it('takes an empty text as no answer, whether it is written or the row is created', () => {
    expect(validateSchemaPropertyValues([title, required], { notes: '', title: 'Task' }).isFail()).toBe(true);
    expect(
      validateSchemaPropertyValues([title, required], { notes: '   ', title: 'Task' }, { written: ['notes'] }).isFail(),
    ).toBe(true);
  });

  it('stops clearing the required property itself', () => {
    const result = validateSchemaPropertyValues([title, required], { title: 'Task' }, { written: ['notes'] });

    expect(result.isFail()).toBe(true);
    expect(String(result.getError().details)).toContain('notes');
  });
});

describe('fillStatusDefaults', () => {
  it('gives a new row the first to-do option of each status', () => {
    expect(fillStatusDefaults([title, stage], { title: 'Task' })).toEqual({ stage: 'next0001', title: 'Task' });
  });

  it('keeps what the row already says', () => {
    expect(fillStatusDefaults([title, stage], { stage: 'done0001', title: 'Task' })).toEqual({
      stage: 'done0001',
      title: 'Task',
    });
  });
});
