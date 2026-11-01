import {
  evaluatePageFormula,
  isPageComputedPropertyType,
  PAGE_FORMULA_RUNTIME_ERROR,
  PAGE_PROPERTY_TYPE,
  type PageFormulaOutcome,
  type PageFormulaScalar,
  type PageFormulaValue,
  type PagePropertyValues,
} from '@neuma/shared';
import type { RowFormulaRecomputed, RowFormulaRecomputeInput } from '../types/pages.computed-recompute.types';
import type { PageComputedError, PagePropertyValue, PageSchemaProperty } from '../types/pages.schema.types';
import { toFormulaPropertyInfo } from './pages.formula.lib';

const toListEntry = (entry: PageFormulaScalar): string => {
  if (typeof entry === 'string') return entry;
  return typeof entry === 'object' ? entry.start : String(entry);
};

const isScalarList = (value: PageFormulaValue): value is readonly PageFormulaScalar[] => Array.isArray(value);

const toPropertyValue = (value: PageFormulaValue): PagePropertyValue | undefined => {
  if (value === null) return undefined;
  return isScalarList(value) ? value.map(toListEntry) : value;
};

/** The values of a row with the ones being written put over them; a value written as removed is no longer there. */
export const applyRowEdits = (
  values: PagePropertyValues,
  edits: Readonly<Record<string, PagePropertyValue | undefined>>,
): PagePropertyValues => {
  const merged: Record<string, PagePropertyValue> = { ...values };
  for (const [key, value] of Object.entries(edits)) {
    if (value === undefined) delete merged[key];
    else merged[key] = value;
  }
  return merged;
};

const isFormula = (property: PageSchemaProperty | undefined): property is PageSchemaProperty =>
  property?.type === PAGE_PROPERTY_TYPE.FORMULA && property.computed?.formula != null;

/**
 * A formula can be recomputed here only when everything it reads is in the row: stored properties and other such
 * formulas. A rollup reads other rows and the clock changes by itself, so those wait for the server.
 */
const createEligibility = (byKey: ReadonlyMap<string, PageSchemaProperty>) => {
  const known = new Map<string, boolean>();
  const isEligible = (key: string, visiting: ReadonlySet<string>): boolean => {
    const cached = known.get(key);
    if (cached !== undefined) return cached;
    const property = byKey.get(key);
    if (visiting.has(key) || property === undefined) return false;
    if (!isPageComputedPropertyType(property.type)) return true;
    const formula = isFormula(property) ? property.computed?.formula : null;
    if (formula == null || formula.isClockDependent) return false;
    const next = new Set(visiting).add(key);
    const result = formula.references.every((reference) => isEligible(reference, next));
    known.set(key, result);
    return result;
  };
  return isEligible;
};

const readsAny = (
  property: PageSchemaProperty,
  byKey: ReadonlyMap<string, PageSchemaProperty>,
  keys: ReadonlySet<string>,
  seen: ReadonlySet<string>,
): boolean => {
  const references = property.computed?.formula?.references ?? [];
  return references.some((reference) => {
    if (keys.has(reference)) return true;
    const other = byKey.get(reference);
    return other !== undefined && !seen.has(reference) && readsAny(other, byKey, keys, new Set(seen).add(reference));
  });
};

/**
 * The formulas of a row that the change just made affects, computed here with the same engine the server uses so the
 * row does not show an old result next to the value that was just typed.
 */
export const recomputeRowFormulas = (input: RowFormulaRecomputeInput): RowFormulaRecomputed => {
  const byKey = new Map(input.properties.map((property) => [property.key, property]));
  const infos = new Map(input.properties.map((property) => [property.key, toFormulaPropertyInfo(property)]));
  const isEligible = createEligibility(byKey);
  const outcomes = new Map<string, PageFormulaOutcome>();
  const outcomeOf = (key: string): PageFormulaOutcome => {
    const known = outcomes.get(key);
    if (known !== undefined) return known;
    const formula = byKey.get(key)?.computed?.formula;
    const outcome: PageFormulaOutcome =
      formula == null
        ? {
            error: { code: PAGE_FORMULA_RUNTIME_ERROR.DEPENDENCY_ERROR, message: 'The formula is not available' },
            isOk: false,
          }
        : evaluatePageFormula(
            formula.ast,
            { properties: infos, readComputed: outcomeOf, values: input.values },
            { nowMilliseconds: 0, timeZone: 'UTC' },
          );
    outcomes.set(key, outcome);
    return outcome;
  };

  const values: Record<string, PagePropertyValue | undefined> = {};
  const errors: Record<string, PageComputedError> = {};
  for (const property of input.properties) {
    const isAffected =
      isFormula(property) &&
      isEligible(property.key, new Set()) &&
      readsAny(property, byKey, input.editedKeys, new Set());
    if (!isAffected) continue;
    const outcome = outcomeOf(property.key);
    if (outcome.isOk) values[property.key] = toPropertyValue(outcome.value);
    else errors[property.key] = outcome.error;
  }
  return { errors, values };
};
