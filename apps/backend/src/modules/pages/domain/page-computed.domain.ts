import { DatabasePropertyType } from '@neuma/db';
import type { PageFormulaOutcome, PageFormulaPropertyInfo } from '@neuma/shared';
import {
  computePageRollup,
  evaluatePageFormula,
  isPageComputedPropertyType,
  PAGE_FORMULA_RUNTIME_ERROR,
} from '@neuma/shared';
import type { SchemaPropertyDefinition } from '../../../common/domain/schema.domain.types';
import type { ComputedCells, ComputedEvaluationInput, ComputedRowInput } from './page-computed.domain.types';

export const toFormulaPropertyInfo = (property: SchemaPropertyDefinition): PageFormulaPropertyInfo => ({
  key: property.key,
  label: property.label,
  options: property.options,
  resultType: property.computed?.formula?.resultType ?? property.computed?.rollup?.resultType ?? null,
  type: property.type,
});

const failOnCycle = (label: string): PageFormulaOutcome => ({
  error: { code: PAGE_FORMULA_RUNTIME_ERROR.DEPENDENCY_ERROR, message: `${label} reads itself` },
  isOk: false,
});

const failOnMissing = (key: string): PageFormulaOutcome => ({
  error: { code: PAGE_FORMULA_RUNTIME_ERROR.DEPENDENCY_ERROR, message: `${key} is not a formula or a rollup` },
  isOk: false,
});

/** An engine fault becomes a cell error, so one bad formula never fails the read; its detail stays out. */
const failOnEngineFault = (label: string): PageFormulaOutcome => ({
  error: { code: PAGE_FORMULA_RUNTIME_ERROR.INVALID_ARGUMENT, message: `${label} could not be computed` },
  isOk: false,
});

const failOnUnavailableTarget = (label: string): PageFormulaOutcome => ({
  error: {
    code: PAGE_FORMULA_RUNTIME_ERROR.ROLLUP_TARGET_UNAVAILABLE,
    message: `${label} reads a collection or a property that is no longer available`,
  },
  isOk: false,
});

/** The stored values the computed properties `keys` read from a row: what their formulas cite and their relations. */
export const listRequiredValueKeys = (
  properties: readonly SchemaPropertyDefinition[],
  keys: ReadonlySet<string> | undefined,
): readonly string[] => {
  const closure = expandComputedKeys(properties, keys);
  const needed = properties
    .filter((property) => closure.has(property.key))
    .flatMap((property) => [
      ...(property.computed?.formula?.references ?? []),
      ...(property.computed?.rollup === null || property.computed?.rollup === undefined
        ? []
        : [property.computed.rollup.relationPropertyKey]),
    ]);
  return [...new Set(needed)];
};

/** The computed properties asked for (all when none is named) and the formulas they read, which are computed too. */
export const expandComputedKeys = (
  properties: readonly SchemaPropertyDefinition[],
  keys: ReadonlySet<string> | undefined,
): ReadonlySet<string> => {
  const byKey = new Map(properties.map((property) => [property.key, property]));
  const closure = new Set<string>();
  const visit = (key: string): void => {
    const property = byKey.get(key);
    if (closure.has(key) || property === undefined || !isPageComputedPropertyType(property.type)) return;
    closure.add(key);
    for (const reference of property.computed?.formula?.references ?? []) visit(reference);
  };
  const wanted = keys ?? new Set(properties.filter((p) => isPageComputedPropertyType(p.type)).map((p) => p.key));
  for (const key of wanted) visit(key);
  return closure;
};

/**
 * The formulas and rollups of the rows, computed in memory from values already read: the formulas read the values of
 * their own row, and the rollups read the values the caller gathered from the related rows. Nothing here reads the
 * database, so a reader's permissions are the caller's to apply to what it gathers.
 */
export const evaluateComputedCells = (input: ComputedEvaluationInput): ComputedCells => {
  const properties = new Map(input.properties.map((property) => [property.key, property]));
  const infos = new Map(input.properties.map((property) => [property.key, toFormulaPropertyInfo(property)]));
  const wanted = input.properties.filter(
    (property) => isPageComputedPropertyType(property.type) && (input.keys?.has(property.key) ?? true),
  );
  const cells = new Map<string, Map<string, PageFormulaOutcome>>();
  for (const row of input.rows) {
    const memo = new Map<string, PageFormulaOutcome>();
    const inProgress = new Set<string>();
    const compute = (key: string): PageFormulaOutcome => {
      const known = memo.get(key);
      if (known !== undefined) return known;
      const property = properties.get(key);
      if (property === undefined || !isPageComputedPropertyType(property.type)) return failOnMissing(key);
      if (inProgress.has(key)) return failOnCycle(property.label);
      inProgress.add(key);
      const outcome = computeProperty(property, row, compute);
      inProgress.delete(key);
      memo.set(key, outcome);
      return outcome;
    };
    const computeProperty = (
      property: SchemaPropertyDefinition,
      subject: ComputedRowInput,
      readOther: (key: string) => PageFormulaOutcome,
    ): PageFormulaOutcome => {
      try {
        return property.type === DatabasePropertyType.ROLLUP
          ? computeRollup(property, subject)
          : computeFormula(property, subject, readOther);
      } catch {
        return failOnEngineFault(property.label);
      }
    };
    const computeFormula = (
      property: SchemaPropertyDefinition,
      subject: ComputedRowInput,
      readOther: (key: string) => PageFormulaOutcome,
    ): PageFormulaOutcome => {
      const formula = property.computed?.formula;
      if (formula === null || formula === undefined) return failOnMissing(property.key);
      return evaluatePageFormula(
        formula.ast,
        { properties: infos, readComputed: readOther, values: subject.values },
        input.context,
      );
    };
    const computeRollup = (property: SchemaPropertyDefinition, subject: ComputedRowInput): PageFormulaOutcome => {
      const rollup = property.computed?.rollup;
      const target = input.rollupTargets.get(property.key);
      if (rollup === null || rollup === undefined) return failOnMissing(property.key);
      if (target === undefined) return failOnUnavailableTarget(property.label);
      const values = input.rollupValues.get(property.key)?.get(subject.id) ?? [];
      return computePageRollup({ calculation: rollup.calculation, target, values });
    };
    cells.set(row.id, new Map(wanted.map((property) => [property.key, compute(property.key)])));
  }
  return cells;
};
