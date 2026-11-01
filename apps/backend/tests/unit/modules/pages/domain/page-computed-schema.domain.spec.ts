import { describe, expect, it } from 'bun:test';
import { DatabasePropertyType } from '@neuma/db';
import { DEFAULT_PAGE_PROPERTY_CONFIG } from '@neuma/shared';
import type { SchemaPropertyDefinition } from '@/common/domain/schema.domain.types';
import { planComputedProperties } from '@/modules/pages/domain/page-computed-schema.domain';
import type { ComputedDraft, SchemaPropertyDraft } from '@/modules/pages/domain/page-schema.domain.types';

const define = (
  changes: Partial<SchemaPropertyDefinition> & Pick<SchemaPropertyDefinition, 'key' | 'type'>,
): SchemaPropertyDefinition => ({
  config: DEFAULT_PAGE_PROPERTY_CONFIG,
  label: changes.key,
  options: null,
  required: false,
  ...changes,
});

const title = define({ key: 'title', label: 'Nombre', required: true, type: DatabasePropertyType.TITLE });
const price = define({ key: 'price', label: 'Precio', type: DatabasePropertyType.NUMBER });
const quantity = define({ key: 'quantity', label: 'Cantidad', type: DatabasePropertyType.NUMBER });
const items = define({
  config: { ...DEFAULT_PAGE_PROPERTY_CONFIG, targetCollectionId: 'lines' },
  key: 'items',
  label: 'Lineas',
  type: DatabasePropertyType.RELATION,
});

const lineTitle = define({ key: 'title', label: 'Nombre', required: true, type: DatabasePropertyType.TITLE });
const amount = define({ key: 'amount', label: 'Monto', type: DatabasePropertyType.NUMBER });

const computed = (key: string, label: string, type: DatabasePropertyType): SchemaPropertyDefinition =>
  define({ key, label, type });

const amountRollup = (targetCollectionId: string): SchemaPropertyDefinition =>
  define({
    computed: {
      formula: null,
      rollup: {
        calculation: 'SUM',
        relationPropertyKey: 'rel',
        resultType: 'NUMBER',
        targetCollectionId,
        targetPropertyKey: targetCollectionId === 'c' ? 'amount' : 'total',
      },
    },
    key: 'total',
    label: 'Total',
    type: DatabasePropertyType.ROLLUP,
  });

const draftOf = (definition: SchemaPropertyDefinition, computedDraft?: ComputedDraft): SchemaPropertyDraft => ({
  computedDraft: computedDraft ?? null,
  config: definition.config,
  key: definition.key,
  label: definition.label,
  options: null,
  required: definition.required,
  twoWay: false,
  type: definition.type,
});

const formulaDraft = (source: string): ComputedDraft => ({ formula: source, rollup: null });

const base = {
  collectionId: 'orders',
  collections: new Map<string, readonly SchemaPropertyDefinition[]>([['lines', [lineTitle, amount]]]),
  dependents: [],
  stored: [] as readonly SchemaPropertyDefinition[],
};

const plan = (
  entries: readonly { definition: SchemaPropertyDefinition; draft?: ComputedDraft }[],
  overrides: Partial<Parameters<typeof planComputedProperties>[0]> = {},
) =>
  planComputedProperties({
    ...base,
    definitions: entries.map((entry) => entry.definition),
    drafts: entries.map((entry) => draftOf(entry.definition, entry.draft)),
    ...overrides,
  });

const detailsOf = (result: ReturnType<typeof plan>): { code: string } => {
  const details: unknown = result.getError().details;
  if (typeof details !== 'object' || details === null || !('code' in details) || typeof details.code !== 'string') {
    throw new Error('The error carries no code');
  }
  return { code: details.code };
};

describe('planning formulas', () => {
  it('leaves a schema without computed properties as it is', () => {
    const result = plan([{ definition: title }, { definition: price }]);

    expect(result.getValue().map((property) => property.computed)).toEqual([undefined, undefined]);
  });

  it('parses a formula and keeps its result type', () => {
    const total = computed('total', 'Total', DatabasePropertyType.FORMULA);

    const result = plan([
      { definition: title },
      { definition: price },
      { definition: quantity },
      { definition: total, draft: formulaDraft('prop("Precio") * prop("Cantidad")') },
    ]);

    const formula = result.getValue().find((property) => property.key === 'total')?.computed?.formula;
    expect(formula?.resultType).toBe('NUMBER');
    expect([...(formula?.references ?? [])].sort()).toEqual(['price', 'quantity']);
  });

  it('lets a formula read another formula, whatever the order they come in', () => {
    const doubled = computed('doubled', 'Doble', DatabasePropertyType.FORMULA);
    const total = computed('total', 'Total', DatabasePropertyType.FORMULA);

    const result = plan([
      { definition: title },
      { definition: price },
      { definition: doubled, draft: formulaDraft('prop("Total") * 2') },
      { definition: total, draft: formulaDraft('prop("Precio") + 1') },
    ]);

    expect(result.isOk()).toBe(true);
  });

  it('refuses a formula with a mistake, saying which one', () => {
    const total = computed('total', 'Total', DatabasePropertyType.FORMULA);

    const syntax = plan([{ definition: title }, { definition: total, draft: formulaDraft('1 +') }]);
    const unknown = plan([{ definition: title }, { definition: total, draft: formulaDraft('prop("Nada")') }]);
    const mismatch = plan([{ definition: title }, { definition: total, draft: formulaDraft('"a" + 1') }]);

    expect(detailsOf(syntax).code).toBe('FORMULA_SYNTAX');
    expect(detailsOf(unknown).code).toBe('FORMULA_UNKNOWN_PROPERTY');
    expect(detailsOf(mismatch).code).toBe('FORMULA_TYPE_MISMATCH');
  });

  it('refuses a cycle between formulas', () => {
    const left = computed('left', 'Izquierda', DatabasePropertyType.FORMULA);
    const right = computed('right', 'Derecha', DatabasePropertyType.FORMULA);

    const result = plan([
      { definition: title },
      { definition: left, draft: formulaDraft('prop("Derecha") + 1') },
      { definition: right, draft: formulaDraft('prop("Izquierda") + 1') },
    ]);

    expect(detailsOf(result).code).toBe('FORMULA_CYCLE');
  });

  it('refuses a formula that reads itself', () => {
    const total = computed('total', 'Total', DatabasePropertyType.FORMULA);

    const result = plan([{ definition: title }, { definition: total, draft: formulaDraft('prop("Total") + 1') }]);

    expect(detailsOf(result).code).toBe('FORMULA_CYCLE');
  });

  it('asks a formula property for a formula', () => {
    const total = computed('total', 'Total', DatabasePropertyType.FORMULA);

    expect(plan([{ definition: title }, { definition: total }]).isFail()).toBe(true);
  });

  it('keeps the formula a property already has when the caller does not send one', () => {
    const total = computed('total', 'Total', DatabasePropertyType.FORMULA);
    const first = plan([
      { definition: title },
      { definition: price },
      { definition: total, draft: formulaDraft('prop("Precio") * 2') },
    ]).getValue();

    const again = plan([{ definition: title }, { definition: price }, { definition: total }], { stored: first });

    expect(again.getValue().find((property) => property.key === 'total')?.computed?.formula?.source).toBe(
      'prop("Precio") * 2',
    );
  });

  it('follows a property that is renamed, so the formula keeps reading it', () => {
    const total = computed('total', 'Total', DatabasePropertyType.FORMULA);
    const first = plan([
      { definition: title },
      { definition: price },
      { definition: total, draft: formulaDraft('prop("Precio") * 2') },
    ]).getValue();
    const renamed = { ...price, label: 'Costo' };

    const again = plan([{ definition: title }, { definition: renamed }, { definition: total }], { stored: first });

    expect(again.getValue().find((property) => property.key === 'total')?.computed?.formula?.source).toBe(
      'prop("Costo") * 2',
    );
  });

  it('refuses to remove a property that a formula reads, naming the formula', () => {
    const total = computed('total', 'Total', DatabasePropertyType.FORMULA);
    const first = plan([
      { definition: title },
      { definition: price },
      { definition: total, draft: formulaDraft('prop("Precio") * 2') },
    ]).getValue();

    const result = plan([{ definition: title }, { definition: total }], { stored: first });

    expect(detailsOf(result).code).toBe('PROPERTY_IN_USE');
    expect(JSON.stringify(result.getError().details)).toContain('Total');
  });
});

describe('planning rollups', () => {
  const rollupDraft = (calculation: string, targetPropertyKey = 'amount'): ComputedDraft => ({
    formula: null,
    rollup: { calculation, relationPropertyKey: 'items', targetPropertyKey },
  });

  const rollupProperty = computed('sum', 'Suma', DatabasePropertyType.ROLLUP);

  it('resolves the related collection and the type of the result', () => {
    const result = plan([
      { definition: title },
      { definition: items },
      { definition: rollupProperty, draft: rollupDraft('SUM') },
    ]);

    const rollup = result.getValue().find((property) => property.key === 'sum')?.computed?.rollup;
    expect(rollup).toEqual({
      calculation: 'SUM',
      relationPropertyKey: 'items',
      resultType: 'NUMBER',
      targetCollectionId: 'lines',
      targetPropertyKey: 'amount',
    });
  });

  it('accepts the relation and the property it reads by their labels and stores their keys', () => {
    const result = plan([
      { definition: title },
      { definition: items },
      {
        definition: rollupProperty,
        draft: {
          formula: null,
          rollup: { calculation: 'SUM', relationPropertyKey: 'lineas', targetPropertyKey: 'MONTO' },
        },
      },
    ]);

    const rollup = result.getValue().find((property) => property.key === 'sum')?.computed?.rollup;
    expect(rollup?.relationPropertyKey).toBe('items');
    expect(rollup?.targetPropertyKey).toBe('amount');
  });

  it('lets a formula read a rollup', () => {
    const doubled = computed('doubled', 'Doble', DatabasePropertyType.FORMULA);

    const result = plan([
      { definition: title },
      { definition: items },
      { definition: rollupProperty, draft: rollupDraft('SUM') },
      { definition: doubled, draft: formulaDraft('prop("Suma") * 2') },
    ]);

    expect(result.getValue().find((property) => property.key === 'doubled')?.computed?.formula?.resultType).toBe(
      'NUMBER',
    );
  });

  it('refuses a rollup over something that is not a relation', () => {
    const result = plan([
      { definition: title },
      { definition: price },
      {
        definition: rollupProperty,
        draft: {
          formula: null,
          rollup: { calculation: 'SUM', relationPropertyKey: 'price', targetPropertyKey: 'amount' },
        },
      },
    ]);

    expect(detailsOf(result).code).toBe('ROLLUP_RELATION_UNKNOWN');
  });

  it('refuses a rollup over a property the related collection does not have', () => {
    const result = plan([
      { definition: title },
      { definition: items },
      { definition: rollupProperty, draft: rollupDraft('SUM', 'missing') },
    ]);

    expect(detailsOf(result).code).toBe('ROLLUP_TARGET_UNKNOWN');
  });

  it('refuses a calculation the target does not offer', () => {
    const result = plan([
      { definition: title },
      { definition: items },
      { definition: rollupProperty, draft: rollupDraft('SUM', 'title') },
    ]);

    expect(detailsOf(result).code).toBe('ROLLUP_CALCULATION_UNAVAILABLE');
  });

  it('refuses a relation to a collection the caller cannot open', () => {
    const result = plan(
      [{ definition: title }, { definition: items }, { definition: rollupProperty, draft: rollupDraft('SUM') }],
      { collections: new Map() },
    );

    expect(detailsOf(result).code).toBe('ROLLUP_RELATION_UNKNOWN');
  });

  it('refuses a rollup whose chain of rollups is longer than three collections', () => {
    const chain = new Map<string, readonly SchemaPropertyDefinition[]>([
      [
        'lines',
        [
          lineTitle,
          define({
            config: { ...DEFAULT_PAGE_PROPERTY_CONFIG, targetCollectionId: 'a' },
            key: 'rel',
            type: DatabasePropertyType.RELATION,
          }),
          amountRollup('a'),
        ],
      ],
      [
        'a',
        [
          lineTitle,
          define({
            config: { ...DEFAULT_PAGE_PROPERTY_CONFIG, targetCollectionId: 'b' },
            key: 'rel',
            type: DatabasePropertyType.RELATION,
          }),
          amountRollup('b'),
        ],
      ],
      [
        'b',
        [
          lineTitle,
          define({
            config: { ...DEFAULT_PAGE_PROPERTY_CONFIG, targetCollectionId: 'c' },
            key: 'rel',
            type: DatabasePropertyType.RELATION,
          }),
          amountRollup('c'),
        ],
      ],
      ['c', [lineTitle, amount]],
    ]);

    const result = plan(
      [
        { definition: title },
        { definition: items },
        { definition: rollupProperty, draft: rollupDraft('SUM', 'total') },
      ],
      { collections: chain },
    );

    expect(detailsOf(result).code).toBe('ROLLUP_DEPTH_EXCEEDED');
  });

  it('refuses to remove a property that a rollup of another collection reads', () => {
    const result = plan([{ definition: title }, { definition: price }], {
      collectionId: 'lines',
      collections: new Map(),
      dependents: [{ calculation: 'SUM', collectionId: 'orders', key: 'sum', targetPropertyKey: 'amount' }],
    });

    expect(detailsOf(result).code).toBe('PROPERTY_IN_USE');
  });

  it('refuses to change a property so that the rollup of another collection can no longer calculate', () => {
    const asText = define({ key: 'amount', label: 'Monto', type: DatabasePropertyType.RICH_TEXT });

    const result = plan([{ definition: title }, { definition: asText }], {
      collectionId: 'lines',
      collections: new Map(),
      dependents: [{ calculation: 'SUM', collectionId: 'orders', key: 'sum', targetPropertyKey: 'amount' }],
    });

    expect(detailsOf(result).code).toBe('PROPERTY_IN_USE');
  });

  it('refuses a cycle through another collection', () => {
    const back = define({
      config: { ...DEFAULT_PAGE_PROPERTY_CONFIG, targetCollectionId: 'orders' },
      key: 'order',
      label: 'Orden',
      type: DatabasePropertyType.RELATION,
    });
    const linesSchema: readonly SchemaPropertyDefinition[] = [
      lineTitle,
      back,
      define({
        computed: {
          formula: null,
          rollup: {
            calculation: 'SUM',
            relationPropertyKey: 'order',
            resultType: 'NUMBER',
            targetCollectionId: 'orders',
            targetPropertyKey: 'sum',
          },
        },
        key: 'orderTotal',
        label: 'Total de orden',
        type: DatabasePropertyType.ROLLUP,
      }),
    ];

    const result = plan(
      [
        { definition: title },
        { definition: items },
        { definition: rollupProperty, draft: rollupDraft('SUM', 'orderTotal') },
      ],
      { collections: new Map([['lines', linesSchema]]) },
    );

    expect(detailsOf(result).code).toBe('FORMULA_CYCLE');
  });
});
