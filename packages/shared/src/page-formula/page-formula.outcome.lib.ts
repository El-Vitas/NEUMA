import { PAGE_FORMULA_RUNTIME_ERROR } from './page-formula.constants.js';
import type { PageFormulaOutcome, PageFormulaRuntimeErrorCode, PageFormulaValue } from './page-formula.types.js';

export const succeedWith = (value: PageFormulaValue): PageFormulaOutcome => ({ isOk: true, value });

export const failWith = (code: PageFormulaRuntimeErrorCode, message: string): PageFormulaOutcome => ({
  error: { code, message },
  isOk: false,
});

export const failWithInvalidArgument = (message: string): PageFormulaOutcome =>
  failWith(PAGE_FORMULA_RUNTIME_ERROR.INVALID_ARGUMENT, message);

/** A number that left the range numbers can hold is an error, not a value to show. */
export const succeedWithNumber = (value: number): PageFormulaOutcome =>
  Number.isFinite(value) ? succeedWith(value) : failWithInvalidArgument('The result is not a finite number');
