import { describe, expect, it } from 'bun:test';
import { DatabasePropertyType } from '@company-brain/db';
import { PAGE_OPTION_COLOR } from '@company-brain/shared';
import type { SchemaPropertyDefinition } from '@/common/domain/schema.domain.types';
import {
  propertyValueMentions,
  rewritePropertyValue,
  rewritePropertyValues,
  rewriteSchemaOption,
} from '@/common/domain/schema-option.domain';

const statusProperty: SchemaPropertyDefinition = {
  key: 'status',
  label: 'Status',
  type: DatabasePropertyType.SELECT,
  required: false,
  options: [
    { color: PAGE_OPTION_COLOR.GREEN, value: 'todo' },
    { color: null, value: 'done' },
  ],
};

const tagsProperty: SchemaPropertyDefinition = {
  key: 'tags',
  label: 'Tags',
  type: DatabasePropertyType.MULTI_SELECT,
  required: false,
  options: [
    { color: null, value: 'urgent' },
    { color: null, value: 'later' },
  ],
};

const titleProperty: SchemaPropertyDefinition = {
  key: 'title',
  label: 'Title',
  type: DatabasePropertyType.TITLE,
  required: true,
  options: null,
};

describe('rewriteSchemaOption — renombrando la opción', () => {
  it('renames the option in place, keeping its color and its position', () => {
    const result = rewriteSchemaOption([titleProperty, statusProperty], {
      from: 'todo',
      propertyKey: 'status',
      to: 'pendiente',
    });

    expect(result.isOk()).toBe(true);
    expect(result.getValue()[1]?.options).toEqual([
      { color: PAGE_OPTION_COLOR.GREEN, value: 'pendiente' },
      { color: null, value: 'done' },
    ]);
  });

  it('leaves every other property untouched', () => {
    const result = rewriteSchemaOption([titleProperty, statusProperty, tagsProperty], {
      from: 'todo',
      propertyKey: 'status',
      to: 'pendiente',
    });

    expect(result.getValue()[2]).toEqual(tagsProperty);
  });

  it('refuses a name another option already has, because two columns would answer to it', () => {
    const result = rewriteSchemaOption([statusProperty], { from: 'todo', propertyKey: 'status', to: 'done' });

    expect(result.isFail()).toBe(true);
  });

  it('refuses a name that is only blank space', () => {
    const result = rewriteSchemaOption([statusProperty], { from: 'todo', propertyKey: 'status', to: '   ' });

    expect(result.isFail()).toBe(true);
  });

  it('refuses to rename what is not there', () => {
    expect(rewriteSchemaOption([statusProperty], { from: 'nope', propertyKey: 'status', to: 'x' }).isFail()).toBe(true);
    expect(rewriteSchemaOption([statusProperty], { from: 'todo', propertyKey: 'missing', to: 'x' }).isFail()).toBe(
      true,
    );
  });

  it('refuses a property that has no options to rename', () => {
    expect(rewriteSchemaOption([titleProperty], { from: 'todo', propertyKey: 'title', to: 'x' }).isFail()).toBe(true);
  });
});

describe('rewriteSchemaOption — quitando la opción', () => {
  it('removes the option without touching the others', () => {
    const result = rewriteSchemaOption([statusProperty], { from: 'todo', propertyKey: 'status', to: null });

    expect(result.getValue()[0]?.options).toEqual([{ color: null, value: 'done' }]);
  });

  it('still refuses to remove what is not there', () => {
    expect(rewriteSchemaOption([statusProperty], { from: 'nope', propertyKey: 'status', to: null }).isFail()).toBe(
      true,
    );
  });
});

describe('propertyValueMentions', () => {
  it('tells which rows have to be rewritten and which can be left alone', () => {
    expect(propertyValueMentions('todo', 'todo')).toBe(true);
    expect(propertyValueMentions(['later', 'urgent'], 'urgent')).toBe(true);
    expect(propertyValueMentions('done', 'todo')).toBe(false);
    expect(propertyValueMentions(undefined, 'todo')).toBe(false);
  });
});

describe('rewritePropertyValue', () => {
  it('rewrites the answer of a row that had the old name', () => {
    expect(rewritePropertyValue('todo', 'todo', 'pendiente')).toBe('pendiente');
  });

  it('leaves alone a row that answered something else', () => {
    expect(rewritePropertyValue('done', 'todo', 'pendiente')).toBe('done');
    expect(rewritePropertyValue(undefined, 'todo', 'pendiente')).toBeUndefined();
  });

  it('rewrites the old name wherever it appears among several answers', () => {
    expect(rewritePropertyValue(['urgent', 'later'], 'urgent', 'urgente')).toEqual(['urgente', 'later']);
  });

  it('leaves alone what is not a name at all', () => {
    expect(rewritePropertyValue(7, 'todo', 'pendiente')).toBe(7);
    expect(rewritePropertyValue(true, 'todo', 'pendiente')).toBe(true);
  });

  it('leaves the row without an answer when the column is gone, instead of taking the row with it', () => {
    expect(rewritePropertyValue('todo', 'todo', null)).toBeUndefined();
    expect(rewritePropertyValue('done', 'todo', null)).toBe('done');
    expect(rewritePropertyValue(['urgent', 'later'], 'urgent', null)).toEqual(['later']);
  });
});

describe('rewritePropertyValues', () => {
  it('rewrites that one property and leaves the rest of the row as it was', () => {
    const stored = { dueDate: '2026-01-01', status: 'todo', title: 'A row' };

    expect(rewritePropertyValues(stored, 'status', 'todo', 'pendiente')).toEqual({
      dueDate: '2026-01-01',
      status: 'pendiente',
      title: 'A row',
    });
  });

  it('drops the property instead of leaving it empty when the column is gone', () => {
    const stored = { status: 'todo', title: 'A row' };

    expect(rewritePropertyValues(stored, 'status', 'todo', null)).toEqual({ title: 'A row' });
  });
});
