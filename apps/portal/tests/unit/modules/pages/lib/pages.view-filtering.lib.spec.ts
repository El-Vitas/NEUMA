import { describe, expect, it } from 'bun:test';
import {
  addViewFilterCondition,
  addViewSort,
  clearViewFilter,
  readViewFilterConditions,
  readViewFilterOperator,
  readViewSorts,
  removeViewFilterCondition,
  removeViewSort,
  setViewFilterConditionOperator,
  setViewFilterConditionValue,
  setViewFilterOperator,
  toggleViewSortDirection,
} from '@/modules/pages/collections/lib/pages.view-filtering.lib';
import type { PageSchemaProperty, PageSchemaView } from '@/modules/pages/collections/types/pages.schema.types';
import { asPropertyOptions } from './pages.options.fixture';

const status: PageSchemaProperty = {
  key: 'status',
  label: 'Status',
  options: asPropertyOptions('todo', 'done'),
  required: false,
  type: 'SELECT',
};
const dueDate: PageSchemaProperty = { key: 'dueDate', label: 'Due date', options: null, required: false, type: 'DATE' };

const table: PageSchemaView = { configuration: {}, isDefault: true, name: 'Table', type: 'TABLE' };
const other: PageSchemaView = { configuration: {}, isDefault: false, name: 'Board', type: 'BOARD' };

const views = [table, other];

describe('reading what a view filters by', () => {
  it('reads no conditions from a view that never filtered', () => {
    expect(readViewFilterConditions(table)).toEqual([]);
  });

  it('joins conditions with «y» until somebody says otherwise', () => {
    expect(readViewFilterOperator(table)).toBe('AND');
  });

  /** A stored filter may be a single condition rather than a group, and it still reads as one condition. */
  it('reads a lone stored condition as the only condition there is', () => {
    const stored: PageSchemaView = {
      ...table,
      configuration: { filter: { kind: 'CONDITION', operator: 'IS', propertyKey: 'status', value: 'todo' } },
    };

    expect(readViewFilterConditions(stored)).toEqual([
      { kind: 'CONDITION', operator: 'IS', propertyKey: 'status', value: 'todo' },
    ]);
  });
});

describe('adding a condition', () => {
  it('starts the condition with an operator that property admits', () => {
    const [filtered] = addViewFilterCondition(views, 'Table', status);

    expect(readViewFilterConditions(filtered as PageSchemaView)).toEqual([
      { kind: 'CONDITION', operator: 'IS', propertyKey: 'status', value: null },
    ]);
  });

  it('gives a date a date operator, not the one a selection would take', () => {
    const [filtered] = addViewFilterCondition(views, 'Table', dueDate);

    expect(readViewFilterConditions(filtered as PageSchemaView)[0]?.operator).toBe('IS');
  });

  /**
   * Dos condiciones a medio armar sobre la misma propiedad son la misma
   * condición escrita dos veces: no dicen nada distinto hasta que una recibe
   * valor, y no habría cómo decirle a la pantalla cuál es cuál.
   */
  it('does not add a second half-made condition on the same property', () => {
    const twice = addViewFilterCondition(addViewFilterCondition(views, 'Table', status), 'Table', status);

    expect(readViewFilterConditions(twice[0] as PageSchemaView)).toHaveLength(1);
  });

  it('does add another condition on a property whose condition already says something', () => {
    const first = setViewFilterConditionValue(addViewFilterCondition(views, 'Table', status), 'Table', 0, 'todo');

    const [both] = addViewFilterCondition(first, 'Table', status);

    expect(readViewFilterConditions(both as PageSchemaView)).toHaveLength(2);
  });

  it('leaves every other view alone', () => {
    const [, untouched] = addViewFilterCondition(views, 'Table', status);

    expect(untouched).toEqual(other);
  });
});

describe('changing a condition', () => {
  const withCondition = addViewFilterCondition(views, 'Table', status);

  it('changes the operator of the condition that was pointed at', () => {
    const [changed] = setViewFilterConditionOperator(withCondition, 'Table', 0, 'IS_NOT');

    expect(readViewFilterConditions(changed as PageSchemaView)[0]?.operator).toBe('IS_NOT');
  });

  /**
   * «Está vacío» asks nothing of a value, so a value left over from the previous
   * operator would sit there unused and travel to the server as noise.
   */
  it('drops the value when the operator stops asking for one', () => {
    const withValue = setViewFilterConditionValue(withCondition, 'Table', 0, 'todo');
    const [emptied] = setViewFilterConditionOperator(withValue, 'Table', 0, 'IS_EMPTY');

    expect(readViewFilterConditions(emptied as PageSchemaView)[0]?.value).toBeNull();
  });

  it('writes the value the condition compares against', () => {
    const [valued] = setViewFilterConditionValue(withCondition, 'Table', 0, 'done');

    expect(readViewFilterConditions(valued as PageSchemaView)[0]?.value).toBe('done');
  });
});

describe('removing a condition', () => {
  it('takes out the one pointed at and keeps the rest', () => {
    const withTwo = addViewFilterCondition(addViewFilterCondition(views, 'Table', status), 'Table', dueDate);

    const [left] = removeViewFilterCondition(withTwo, 'Table', 0);

    expect(readViewFilterConditions(left as PageSchemaView).map((condition) => condition.propertyKey)).toEqual([
      'dueDate',
    ]);
  });

  /** A view with no conditions left is a view that does not filter, not one filtering by nothing. */
  it('leaves the view without a filter once the last condition goes', () => {
    const withOne = addViewFilterCondition(views, 'Table', status);

    const [empty] = removeViewFilterCondition(withOne, 'Table', 0);

    expect(readViewFilterConditions(empty as PageSchemaView)).toEqual([]);
    expect((empty as PageSchemaView).configuration).toMatchObject({ filter: null });
  });
});

describe('clearing the filter', () => {
  /** Quitar las condiciones de a una guardaría una vez por condición; quitarlas todas es un solo cambio. */
  it('leaves the view without a filter in one go', () => {
    const withTwo = addViewFilterCondition(addViewFilterCondition(views, 'Table', status), 'Table', dueDate);

    const [cleared] = clearViewFilter(withTwo, 'Table');

    expect(readViewFilterConditions(cleared as PageSchemaView)).toEqual([]);
    expect((cleared as PageSchemaView).configuration).toMatchObject({ filter: null });
  });
});

describe('joining conditions', () => {
  it('switches between «y» and «o» without touching the conditions', () => {
    const withTwo = addViewFilterCondition(addViewFilterCondition(views, 'Table', status), 'Table', dueDate);

    const [joined] = setViewFilterOperator(withTwo, 'Table', 'OR');

    expect(readViewFilterOperator(joined as PageSchemaView)).toBe('OR');
    expect(readViewFilterConditions(joined as PageSchemaView)).toHaveLength(2);
  });
});

describe('ordering rows', () => {
  it('reads no order from a view that never ordered', () => {
    expect(readViewSorts(table)).toEqual([]);
  });

  it('adds an order that starts ascending', () => {
    const [ordered] = addViewSort(views, 'Table', 'dueDate');

    expect(readViewSorts(ordered as PageSchemaView)).toEqual([{ direction: 'ASCENDING', propertyKey: 'dueDate' }]);
  });

  it('does not order twice by the same property', () => {
    const [ordered] = addViewSort(addViewSort(views, 'Table', 'dueDate'), 'Table', 'dueDate');

    expect(readViewSorts(ordered as PageSchemaView)).toHaveLength(1);
  });

  it('turns one order around without disturbing the chain', () => {
    const chained = addViewSort(addViewSort(views, 'Table', 'dueDate'), 'Table', 'status');

    const [turned] = toggleViewSortDirection(chained, 'Table', 0);

    expect(readViewSorts(turned as PageSchemaView)).toEqual([
      { direction: 'DESCENDING', propertyKey: 'dueDate' },
      { direction: 'ASCENDING', propertyKey: 'status' },
    ]);
  });

  it('removes one order and keeps the others in their order', () => {
    const chained = addViewSort(addViewSort(views, 'Table', 'dueDate'), 'Table', 'status');

    const [left] = removeViewSort(chained, 'Table', 0);

    expect(readViewSorts(left as PageSchemaView)).toEqual([{ direction: 'ASCENDING', propertyKey: 'status' }]);
  });
});
