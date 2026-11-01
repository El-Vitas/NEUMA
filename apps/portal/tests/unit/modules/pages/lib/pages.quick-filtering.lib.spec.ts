import { describe, expect, it } from 'bun:test';
import type { PageFilterGroup } from '@neuma/shared';
import { editQuickFilter, readQuickFilterRoot } from '@/modules/pages/collections/lib/pages.quick-filtering.lib';
import {
  addViewFilterCondition,
  setViewFilterConditionValue,
} from '@/modules/pages/collections/lib/pages.view-filtering.lib';
import type { PageSchemaProperty } from '@/modules/pages/collections/types/pages.schema.types';
import { defaultConfig } from './pages.options.fixture';

const owner: PageSchemaProperty = {
  config: defaultConfig,
  key: 'owner',
  label: 'Owner',
  options: null,
  required: false,
  type: 'PERSON',
};

describe('el filtro rápido', () => {
  it('starts as an empty group when there is no quick filter', () => {
    expect(readQuickFilterRoot(null)).toEqual({ conditions: [], kind: 'GROUP', operator: 'AND' });
  });

  it('wraps a bare condition in a group', () => {
    const condition = { kind: 'CONDITION', operator: 'IS', propertyKey: 'a', value: 1 } as const;

    expect(readQuickFilterRoot(condition)).toEqual({ conditions: [condition], kind: 'GROUP', operator: 'AND' });
  });

  it('applies the edits of the saved filter to the quick one, without a view', () => {
    const added = editQuickFilter(null, (views, name) => addViewFilterCondition(views, name, [], owner));
    const root = added as PageFilterGroup;

    expect(root.conditions).toHaveLength(1);
    const valued = editQuickFilter(root, (views, name) => setViewFilterConditionValue(views, name, [0], '@me'));
    expect((valued as PageFilterGroup).conditions[0]).toMatchObject({ propertyKey: 'owner', value: '@me' });
  });

  it('is nothing at all once the last condition goes', () => {
    const root = editQuickFilter(null, (views, name) => addViewFilterCondition(views, name, [], owner));

    expect(
      editQuickFilter(root, (views) => views.map((view) => ({ ...view, configuration: { filter: null } }))),
    ).toBeNull();
  });
});
