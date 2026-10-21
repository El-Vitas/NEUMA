import { describe, expect, it } from 'bun:test';
import { DatabasePropertyType } from '@neuma/db';
import { DEFAULT_PAGE_PROPERTY_CONFIG, PAGE_OPTION_COLOR, PAGE_STATUS_GROUP } from '@neuma/shared';
import type { SchemaPropertyDefinition } from '@/common/domain/schema.domain.types';
import {
  findOptionReplacement,
  propertyValueMentions,
  rewritePropertyValue,
  rewritePropertyValues,
  rewriteSchemaOption,
} from '@/common/domain/schema-option.domain';

const statusProperty: SchemaPropertyDefinition = {
  config: DEFAULT_PAGE_PROPERTY_CONFIG,
  key: 'status',
  label: 'Status',
  type: DatabasePropertyType.SELECT,
  required: false,
  options: [
    { color: PAGE_OPTION_COLOR.GREEN, group: null, id: 'todo0001', value: 'todo' },
    { color: null, group: null, id: 'done0001', value: 'done' },
  ],
};

const tagsProperty: SchemaPropertyDefinition = {
  config: DEFAULT_PAGE_PROPERTY_CONFIG,
  key: 'tags',
  label: 'Tags',
  type: DatabasePropertyType.MULTI_SELECT,
  required: false,
  options: [
    { color: null, group: null, id: 'urgent01', value: 'urgent' },
    { color: null, group: null, id: 'later001', value: 'later' },
  ],
};

const stageProperty: SchemaPropertyDefinition = {
  config: DEFAULT_PAGE_PROPERTY_CONFIG,
  key: 'stage',
  label: 'Stage',
  type: DatabasePropertyType.STATUS,
  required: false,
  options: [
    { color: null, group: PAGE_STATUS_GROUP.TO_DO, id: 'next0001', value: 'Next' },
    { color: null, group: PAGE_STATUS_GROUP.TO_DO, id: 'later001', value: 'Later' },
    { color: null, group: PAGE_STATUS_GROUP.IN_PROGRESS, id: 'doing001', value: 'Doing' },
    { color: null, group: PAGE_STATUS_GROUP.COMPLETE, id: 'done0001', value: 'Done' },
  ],
};

const titleProperty: SchemaPropertyDefinition = {
  config: DEFAULT_PAGE_PROPERTY_CONFIG,
  key: 'title',
  label: 'Title',
  type: DatabasePropertyType.TITLE,
  required: true,
  options: null,
};

describe('rewriteSchemaOption — renombrando la opción', () => {
  it('renames the option in place, keeping its id, its color and its position', () => {
    const result = rewriteSchemaOption([titleProperty, statusProperty], {
      optionId: 'todo0001',
      propertyKey: 'status',
      to: 'pendiente',
    });

    expect(result.isOk()).toBe(true);
    expect(result.getValue()[1]?.options).toEqual([
      { color: PAGE_OPTION_COLOR.GREEN, group: null, id: 'todo0001', value: 'pendiente' },
      { color: null, group: null, id: 'done0001', value: 'done' },
    ]);
  });

  it('leaves every other property untouched', () => {
    const result = rewriteSchemaOption([titleProperty, statusProperty, tagsProperty], {
      optionId: 'todo0001',
      propertyKey: 'status',
      to: 'pendiente',
    });

    expect(result.getValue()[2]).toEqual(tagsProperty);
  });

  it('refuses a name another option already has, because two columns would answer to it', () => {
    const result = rewriteSchemaOption([statusProperty], { optionId: 'todo0001', propertyKey: 'status', to: 'done' });

    expect(result.isFail()).toBe(true);
  });

  it('refuses a name that is only blank space', () => {
    const result = rewriteSchemaOption([statusProperty], { optionId: 'todo0001', propertyKey: 'status', to: '   ' });

    expect(result.isFail()).toBe(true);
  });

  it('refuses to rename what is not there', () => {
    expect(
      rewriteSchemaOption([statusProperty], { optionId: 'nothere1', propertyKey: 'status', to: 'x' }).isFail(),
    ).toBe(true);
    expect(
      rewriteSchemaOption([statusProperty], { optionId: 'todo0001', propertyKey: 'missing', to: 'x' }).isFail(),
    ).toBe(true);
  });

  it('refuses a name given as the id, because rows hold ids and the name can change', () => {
    expect(rewriteSchemaOption([statusProperty], { optionId: 'todo', propertyKey: 'status', to: 'x' }).isFail()).toBe(
      true,
    );
  });

  it('refuses a property that has no options to rename', () => {
    expect(rewriteSchemaOption([titleProperty], { optionId: 'todo0001', propertyKey: 'title', to: 'x' }).isFail()).toBe(
      true,
    );
  });
});

describe('rewriteSchemaOption — quitando la opción', () => {
  it('removes the option without touching the others', () => {
    const result = rewriteSchemaOption([statusProperty], { optionId: 'todo0001', propertyKey: 'status', to: null });

    expect(result.getValue()[0]?.options).toEqual([{ color: null, group: null, id: 'done0001', value: 'done' }]);
  });

  it('still refuses to remove what is not there', () => {
    expect(
      rewriteSchemaOption([statusProperty], { optionId: 'nothere1', propertyKey: 'status', to: null }).isFail(),
    ).toBe(true);
  });

  it('keeps at least one option in every group of a status', () => {
    const lastOfItsGroup = rewriteSchemaOption([stageProperty], {
      optionId: 'doing001',
      propertyKey: 'stage',
      to: null,
    });
    const oneOfTwo = rewriteSchemaOption([stageProperty], { optionId: 'later001', propertyKey: 'stage', to: null });

    expect(lastOfItsGroup.isFail()).toBe(true);
    expect(oneOfTwo.isOk()).toBe(true);
  });
});

describe('findOptionReplacement', () => {
  it('sends the rows of a removed status option to the first option left in the same group', () => {
    expect(findOptionReplacement(stageProperty, 'later001')).toBe('next0001');
    expect(findOptionReplacement(stageProperty, 'next0001')).toBe('later001');
  });

  it('has no replacement for a selection, whose rows just lose the answer', () => {
    expect(findOptionReplacement(statusProperty, 'todo0001')).toBeNull();
  });
});

describe('propertyValueMentions', () => {
  it('tells which rows have to be rewritten and which can be left alone', () => {
    expect(propertyValueMentions('todo0001', 'todo0001')).toBe(true);
    expect(propertyValueMentions(['later001', 'urgent01'], 'urgent01')).toBe(true);
    expect(propertyValueMentions('done0001', 'todo0001')).toBe(false);
    expect(propertyValueMentions(undefined, 'todo0001')).toBe(false);
  });
});

describe('rewritePropertyValue', () => {
  it('replaces the answer of a row that had the removed option', () => {
    expect(rewritePropertyValue('later001', 'later001', 'next0001')).toBe('next0001');
  });

  it('leaves alone a row that answered something else', () => {
    expect(rewritePropertyValue('done0001', 'todo0001', null)).toBe('done0001');
    expect(rewritePropertyValue(undefined, 'todo0001', null)).toBeUndefined();
  });

  it('takes the removed option out of several answers', () => {
    expect(rewritePropertyValue(['urgent01', 'later001'], 'urgent01', null)).toEqual(['later001']);
  });

  it('leaves alone what is not an id at all', () => {
    expect(rewritePropertyValue(7, 'todo0001', null)).toBe(7);
    expect(rewritePropertyValue(true, 'todo0001', null)).toBe(true);
  });

  it('leaves the row without an answer when there is no replacement, instead of taking the row with it', () => {
    expect(rewritePropertyValue('todo0001', 'todo0001', null)).toBeUndefined();
  });
});

describe('rewritePropertyValues', () => {
  it('rewrites that one property and leaves the rest of the row as it was', () => {
    const stored = { dueDate: { start: '2026-01-01' }, stage: 'later001', title: 'A row' };

    expect(rewritePropertyValues(stored, 'stage', 'later001', 'next0001')).toEqual({
      dueDate: { start: '2026-01-01' },
      stage: 'next0001',
      title: 'A row',
    });
  });

  it('drops the property instead of leaving it empty when nothing replaces the option', () => {
    const stored = { status: 'todo0001', title: 'A row' };

    expect(rewritePropertyValues(stored, 'status', 'todo0001', null)).toEqual({ title: 'A row' });
  });
});
