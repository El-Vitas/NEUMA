import { Result } from '../result.js';
import { PAGE_FORMULA_SAVE_ERROR, PAGE_FORMULA_SOURCE_MAX_LENGTH } from './page-formula.constants.js';
import { inspectPageFormula } from './page-formula.check.lib.js';
import { tokenizePageFormula } from './page-formula.lexer.lib.js';
import { parsePageFormulaTokens } from './page-formula.syntax.lib.js';
import type {
  PageFormulaDefinition,
  PageFormulaNode,
  PageFormulaPropertyInfo,
  PageFormulaSaveError,
} from './page-formula.types.js';

const tooLong = (source: string): PageFormulaSaveError => ({
  code: PAGE_FORMULA_SAVE_ERROR.TOO_LARGE,
  from: 0,
  message: `A formula has up to ${String(PAGE_FORMULA_SOURCE_MAX_LENGTH)} characters`,
  suggestions: [],
  to: source.length,
});

/** Reads the text and resolves the property names against `properties`, without checking types. */
export const parsePageFormulaTree = (
  source: string,
  properties: readonly PageFormulaPropertyInfo[],
): Result<PageFormulaNode, PageFormulaSaveError> => {
  if (source.length > PAGE_FORMULA_SOURCE_MAX_LENGTH) return Result.fail(tooLong(source));
  const tokens = tokenizePageFormula(source);
  if (tokens.isFail()) return Result.fail(tokens.getError());
  return parsePageFormulaTokens(tokens.getValue(), properties);
};

/** Reads, resolves the property names against `properties` and checks the types: everything save time rejects. */
export const parsePageFormula = (
  source: string,
  properties: readonly PageFormulaPropertyInfo[],
): Result<PageFormulaDefinition, PageFormulaSaveError> => {
  const parsed = parsePageFormulaTree(source, properties);
  if (parsed.isFail()) return Result.fail(parsed.getError());
  const ast = parsed.getValue();
  const inspected = inspectPageFormula(ast, properties);
  if (inspected.isFail()) return Result.fail(inspected.getError());
  const { isClockDependent, references, resultType } = inspected.getValue();
  return Result.ok({ ast, isClockDependent, references, resultType, source });
};
