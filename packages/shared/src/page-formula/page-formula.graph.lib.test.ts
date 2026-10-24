import { describe, expect, test } from 'bun:test';
import { PAGE_PROPERTY_TYPE } from '../types/page-schema.types.js';
import { findPageReferenceCycle, measurePageReferenceDepth } from './page-formula.graph.lib.js';
import { parsePageFormula } from './page-formula.parse.lib.js';
import { renamePageFormulaProperty } from './page-formula.rename.lib.js';
import type { PageFormulaPropertyInfo } from './page-formula.types.js';

describe('reference cycles', () => {
  test('finds none in a chain', () => {
    const edges = new Map([
      ['a', ['b']],
      ['b', ['c']],
      ['c', []],
    ]);

    expect(findPageReferenceCycle(edges)).toBeNull();
  });

  test('names the properties of a cycle', () => {
    const edges = new Map([
      ['a', ['b']],
      ['b', ['c']],
      ['c', ['a']],
    ]);

    const cycle = findPageReferenceCycle(edges);

    expect(cycle).not.toBeNull();
    expect([...(cycle ?? [])].sort((first, second) => first.localeCompare(second))).toEqual(['a', 'b', 'c']);
  });

  test('finds a property that reads itself', () => {
    expect(findPageReferenceCycle(new Map([['a', ['a']]]))).toEqual(['a']);
  });

  test('ignores references to properties that read nothing', () => {
    expect(findPageReferenceCycle(new Map([['a', ['stored']]]))).toBeNull();
  });
});

describe('reference depth', () => {
  test('counts the properties a chain passes through', () => {
    const edges = new Map([
      ['a', ['b']],
      ['b', ['c']],
      ['c', []],
    ]);

    expect(measurePageReferenceDepth(edges, 'a')).toBe(3);
    expect(measurePageReferenceDepth(edges, 'c')).toBe(1);
  });
});

describe('renaming a property', () => {
  const properties: readonly PageFormulaPropertyInfo[] = [
    { key: 'price', label: 'Precio', options: null, resultType: null, type: PAGE_PROPERTY_TYPE.NUMBER },
    { key: 'name', label: 'Nombre', options: null, resultType: null, type: PAGE_PROPERTY_TYPE.TITLE },
  ];

  test('rewrites only the quoted names that cite it and keeps the rest as written', () => {
    const definition = parsePageFormula(
      'prop("Precio")  *   2 + prop("Precio") + length(prop("Nombre"))',
      properties,
    ).getValue();

    const renamed = renamePageFormulaProperty(definition, 'price', 'Costo "neto"');

    expect(renamed).toBe('prop("Costo \\"neto\\"")  *   2 + prop("Costo \\"neto\\"") + length(prop("Nombre"))');
  });

  test('parses again to the same tree after the rename', () => {
    const definition = parsePageFormula('prop("Precio") * 2', properties).getValue();
    const renamed = renamePageFormulaProperty(definition, 'price', 'Costo');
    const renamedProperties = properties.map((property) =>
      property.key === 'price' ? { ...property, label: 'Costo' } : property,
    );

    const reparsed = parsePageFormula(renamed, renamedProperties).getValue();

    expect(reparsed.references).toEqual(['price']);
    expect(reparsed.resultType).toBe('NUMBER');
  });
});
