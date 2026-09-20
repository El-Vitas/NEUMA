import { describe, expect, it } from 'bun:test';
import type { PageFilter, PageFilterCondition, PageFilterGroup } from '@company-brain/shared';
import { readPageViewConfiguration } from '@company-brain/shared';
import {
  addViewFilterCondition,
  addViewFilterGroup,
  addViewSort,
  canNestFilterGroup,
  clearViewFilter,
  countFilterConditions,
  moveViewProperty,
  moveViewPropertySideways,
  readViewColumnWidths,
  readViewFilterRoot,
  readViewFrozenColumns,
  readViewSorts,
  removeViewFilterNode,
  removeViewSort,
  setViewColumnWidth,
  setViewFilterConditionOperator,
  setViewFilterConditionValue,
  setViewFilterGroupOperator,
  setViewFrozenColumns,
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

const ROOT: readonly number[] = [];

const rootOf = (rewritten: readonly PageSchemaView[]): PageFilterGroup =>
  readViewFilterRoot(rewritten[0] as PageSchemaView);

const nodeAt = (rewritten: readonly PageSchemaView[], path: readonly number[]): PageFilter | undefined =>
  path.reduce<PageFilter | undefined>(
    (node, index) => (node !== undefined && node.kind === 'GROUP' ? node.conditions[index] : undefined),
    rootOf(rewritten),
  );

const conditionAt = (rewritten: readonly PageSchemaView[], path: readonly number[]): PageFilterCondition => {
  const node = nodeAt(rewritten, path);
  if (node === undefined || node.kind !== 'CONDITION') throw new Error(`No condition at ${path.join('.')}`);
  return node;
};

describe('reading what a view filters by', () => {
  it('reads an empty group from a view that never filtered', () => {
    expect(readViewFilterRoot(table)).toEqual({ conditions: [], kind: 'GROUP', operator: 'AND' });
  });

  /**
   * Lo guardado puede ser una condición suelta —el contrato lo admite—, y quien
   * la muestra no debería tener que distinguir ese caso: se lee como el grupo de
   * una sola condición que es.
   */
  it('reads a lone stored condition as a group holding it', () => {
    const stored: PageSchemaView = {
      ...table,
      configuration: { filter: { kind: 'CONDITION', operator: 'IS', propertyKey: 'status', value: 'todo' } },
    };

    expect(readViewFilterRoot(stored)).toEqual({
      conditions: [{ kind: 'CONDITION', operator: 'IS', propertyKey: 'status', value: 'todo' }],
      kind: 'GROUP',
      operator: 'AND',
    });
  });
});

describe('adding a condition', () => {
  it('starts the condition with an operator that property admits', () => {
    const filtered = addViewFilterCondition(views, 'Table', ROOT, status);

    expect(rootOf(filtered).conditions).toEqual([
      { kind: 'CONDITION', operator: 'IS', propertyKey: 'status', value: null },
    ]);
  });

  it('gives a date a date operator, not the one a selection would take', () => {
    expect(conditionAt(addViewFilterCondition(views, 'Table', ROOT, dueDate), [0]).operator).toBe('IS');
  });

  /**
   * Dos condiciones a medio armar sobre la misma propiedad son la misma
   * condición escrita dos veces: no dicen nada distinto hasta que una recibe
   * valor, y no habría cómo decirle a la pantalla cuál es cuál.
   */
  it('does not add a second half-made condition on the same property', () => {
    const twice = addViewFilterCondition(addViewFilterCondition(views, 'Table', ROOT, status), 'Table', ROOT, status);

    expect(rootOf(twice).conditions).toHaveLength(1);
  });

  it('does add another condition on a property whose condition already says something', () => {
    const first = setViewFilterConditionValue(
      addViewFilterCondition(views, 'Table', ROOT, status),
      'Table',
      [0],
      'todo',
    );

    expect(rootOf(addViewFilterCondition(first, 'Table', ROOT, status)).conditions).toHaveLength(2);
  });

  it('leaves every other view alone', () => {
    const [, untouched] = addViewFilterCondition(views, 'Table', ROOT, status);

    expect(untouched).toEqual(other);
  });
});

describe('changing a condition', () => {
  const withCondition = addViewFilterCondition(views, 'Table', ROOT, status);

  it('changes the operator of the condition that was pointed at', () => {
    expect(conditionAt(setViewFilterConditionOperator(withCondition, 'Table', [0], 'IS_NOT'), [0]).operator).toBe(
      'IS_NOT',
    );
  });

  /**
   * «Está vacío» asks nothing of a value, so a value left over from the previous
   * operator would sit there unused and travel to the server as noise.
   */
  it('drops the value when the operator stops asking for one', () => {
    const withValue = setViewFilterConditionValue(withCondition, 'Table', [0], 'todo');

    expect(conditionAt(setViewFilterConditionOperator(withValue, 'Table', [0], 'IS_EMPTY'), [0]).value).toBeNull();
  });

  it('writes the value the condition compares against', () => {
    expect(conditionAt(setViewFilterConditionValue(withCondition, 'Table', [0], 'done'), [0]).value).toBe('done');
  });
});

describe('removing a node', () => {
  it('takes out the one pointed at and keeps the rest', () => {
    const withTwo = addViewFilterCondition(
      addViewFilterCondition(views, 'Table', ROOT, status),
      'Table',
      ROOT,
      dueDate,
    );

    expect(rootOf(removeViewFilterNode(withTwo, 'Table', [0])).conditions).toEqual([
      { kind: 'CONDITION', operator: 'IS', propertyKey: 'dueDate', value: null },
    ]);
  });

  /** A view with no conditions left is a view that does not filter, not one filtering by nothing. */
  it('leaves the view without a filter once the last condition goes', () => {
    const withOne = addViewFilterCondition(views, 'Table', ROOT, status);

    const [empty] = removeViewFilterNode(withOne, 'Table', [0]);

    expect((empty as PageSchemaView).configuration).toMatchObject({ filter: null });
  });
});

describe('clearing the filter', () => {
  /** Quitar las condiciones de a una guardaría una vez por condición; quitarlas todas es un solo cambio. */
  it('leaves the view without a filter in one go', () => {
    const withTwo = addViewFilterCondition(
      addViewFilterCondition(views, 'Table', ROOT, status),
      'Table',
      ROOT,
      dueDate,
    );

    const [cleared] = clearViewFilter(withTwo, 'Table');

    expect((cleared as PageSchemaView).configuration).toMatchObject({ filter: null });
  });
});

describe('joining conditions', () => {
  it('switches between «y» and «o» without touching the conditions', () => {
    const withTwo = addViewFilterCondition(
      addViewFilterCondition(views, 'Table', ROOT, status),
      'Table',
      ROOT,
      dueDate,
    );

    const joined = setViewFilterGroupOperator(withTwo, 'Table', ROOT, 'OR');

    expect(rootOf(joined).operator).toBe('OR');
    expect(rootOf(joined).conditions).toHaveLength(2);
  });
});

describe('anidando grupos de condiciones', () => {
  const withGroup = addViewFilterGroup(addViewFilterCondition(views, 'Table', ROOT, status), 'Table', ROOT);

  /** Un grupo nace uniendo con «o»: quien lo abre dentro de un «y» está pidiendo justo lo que el «y» no da. */
  it('opens a group that joins with «o» inside a root that joins with «y»', () => {
    expect(rootOf(withGroup).operator).toBe('AND');
    expect(nodeAt(withGroup, [1])).toEqual({ conditions: [], kind: 'GROUP', operator: 'OR' });
  });

  it('puts a condition inside the group it was asked for, not beside it', () => {
    const inside = addViewFilterCondition(withGroup, 'Table', [1], dueDate);

    expect(rootOf(inside).conditions).toHaveLength(2);
    expect(conditionAt(inside, [1, 0]).propertyKey).toBe('dueDate');
  });

  it('changes a nested condition without disturbing the one outside', () => {
    const inside = addViewFilterCondition(withGroup, 'Table', [1], dueDate);

    const changed = setViewFilterConditionValue(inside, 'Table', [1, 0], '2026-08-10');

    expect(conditionAt(changed, [1, 0]).value).toBe('2026-08-10');
    expect(conditionAt(changed, [0]).propertyKey).toBe('status');
  });

  it('joins a nested group on its own, apart from the root', () => {
    const joined = setViewFilterGroupOperator(withGroup, 'Table', [1], 'AND');

    expect(rootOf(joined).operator).toBe('AND');
    expect(nodeAt(joined, [1])).toMatchObject({ operator: 'AND' });
  });

  it('takes out a whole group, and everything it held with it', () => {
    const inside = addViewFilterCondition(withGroup, 'Table', [1], dueDate);

    expect(rootOf(removeViewFilterNode(inside, 'Table', [1])).conditions).toHaveLength(1);
  });

  /** Tres niveles es lo que el contrato admite, contando la condición: el grupo de un grupo ya no cabe. */
  it('refuses to open a group inside a group', () => {
    expect(canNestFilterGroup(ROOT)).toBe(true);
    expect(canNestFilterGroup([1])).toBe(false);
    expect(addViewFilterGroup(withGroup, 'Table', [1])).toEqual(withGroup);
  });

  it('counts every condition there is, however deep it sits', () => {
    const inside = addViewFilterCondition(withGroup, 'Table', [1], dueDate);

    expect(countFilterConditions(rootOf(inside))).toBe(2);
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

describe('moviendo las columnas de una tabla', () => {
  const shown = [status.key, dueDate.key];
  const columnsOf = (rewritten: readonly PageSchemaView[]) =>
    readPageViewConfiguration(rewritten[0]?.configuration ?? {}).visibleProperties;

  /**
   * Una vista que nunca eligió qué mostrar no tiene lista que reordenar. Se le
   * escribe entera tal como se estaba viendo, que es lo que enseñaba, y recién
   * ahí se mueve una: sin eso, mover una columna la haría la única visible.
   */
  it('writes down what it was already showing before moving anything', () => {
    expect(columnsOf(moveViewProperty(views, 'Table', shown, 'dueDate', 'status'))).toEqual(['dueDate', 'status']);
  });

  it('puts it last when it was dropped after everything', () => {
    expect(columnsOf(moveViewProperty(views, 'Table', shown, 'status', null))).toEqual(['dueDate', 'status']);
  });

  it('leaves the view alone when it lands where it already was', () => {
    expect(columnsOf(moveViewProperty(views, 'Table', shown, 'status', 'status'))).toBeNull();
  });

  it('moves one place to each side with the keyboard', () => {
    expect(columnsOf(moveViewPropertySideways(views, 'Table', shown, 'status', 'LATER'))).toEqual([
      'dueDate',
      'status',
    ]);
    expect(columnsOf(moveViewPropertySideways(views, 'Table', shown, 'dueDate', 'EARLIER'))).toEqual([
      'dueDate',
      'status',
    ]);
  });

  it('refuses to walk off either end', () => {
    expect(moveViewPropertySideways(views, 'Table', shown, 'status', 'EARLIER')).toEqual(views);
    expect(moveViewPropertySideways(views, 'Table', shown, 'dueDate', 'LATER')).toEqual(views);
  });
});

describe('lo que una tabla guarda de sus propias columnas', () => {
  it('keeps a width, and how many columns stay put', () => {
    const [wide] = setViewColumnWidth(views, 'Table', 'status', 240);
    const [frozen] = setViewFrozenColumns(views, 'Table', 2);

    expect(readViewColumnWidths(wide as PageSchemaView)).toEqual({ status: 240 });
    expect(readViewFrozenColumns(frozen as PageSchemaView)).toBe(2);
  });

  it('refuses to freeze a negative number of columns', () => {
    const [frozen] = setViewFrozenColumns(views, 'Table', -3);

    expect(readViewFrozenColumns(frozen as PageSchemaView)).toBe(0);
  });
});
