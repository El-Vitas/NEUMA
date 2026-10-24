import type { PageFormulaPropertyInfo } from '@neuma/shared';
import { isPageComputedPropertyType, parsePageFormula } from '@neuma/shared';
import type { FormulaCheck } from '../types/pages.formula.types';
import type { PageSchemaProperty } from '../types/pages.schema.types';

/** A property as a formula reads it: a formula or rollup carries the type of the result it was saved with. */
export const toFormulaPropertyInfo = (property: PageSchemaProperty): PageFormulaPropertyInfo => ({
  key: property.key,
  label: property.label,
  options: property.options,
  resultType: isPageComputedPropertyType(property.type)
    ? (property.computed?.formula?.resultType ?? property.computed?.rollup?.resultType ?? null)
    : null,
  type: property.type,
});

/**
 * Whether the text of a formula would be accepted, checked here with the engine the server uses so the person sees
 * what is wrong while typing. The server still decides: a cycle, for example, is only known with every property.
 */
export const checkFormulaText = (text: string, properties: readonly PageSchemaProperty[]): FormulaCheck => {
  const parsed = parsePageFormula(text, properties.map(toFormulaPropertyInfo));
  return parsed.isFail()
    ? { isValid: false, problem: parsed.getError() }
    : { isValid: true, resultType: parsed.getValue().resultType };
};
