import type { PageFormulaRuntimeErrorCode, PageFormulaSaveErrorCode, PageFormulaType } from './page-formula.types.js';

export const PAGE_FORMULA_SOURCE_MAX_LENGTH = 2000;

export const PAGE_FORMULA_MAX_NODES = 500;

export const PAGE_FORMULA_MAX_DEPTH = 24;

/** One step per node evaluated and per list element or character a function walks over. */
export const PAGE_FORMULA_STEP_BUDGET = 10_000;

export const PAGE_FORMULA_TEXT_MAX_LENGTH = 10_000;

/** A rollup may read a formula or a rollup of another collection, up to this many collections deep. */
export const PAGE_ROLLUP_MAX_DEPTH = 3;

export const PAGE_FORMULA_TYPE = {
  BOOLEAN: 'BOOLEAN',
  DATE: 'DATE',
  LIST: 'LIST',
  NUMBER: 'NUMBER',
  TEXT: 'TEXT',
} as const satisfies Record<PageFormulaType, PageFormulaType>;

/** The result types a formula property can have: a list only comes out of a rollup that shows the original values. */
export const PAGE_FORMULA_RESULT_TYPE_VALUES = [
  PAGE_FORMULA_TYPE.NUMBER,
  PAGE_FORMULA_TYPE.TEXT,
  PAGE_FORMULA_TYPE.BOOLEAN,
  PAGE_FORMULA_TYPE.DATE,
] as const;

export const PAGE_FORMULA_SAVE_ERROR = {
  CYCLE: 'FORMULA_CYCLE',
  SYNTAX: 'FORMULA_SYNTAX',
  TOO_LARGE: 'FORMULA_TOO_LARGE',
  TYPE_MISMATCH: 'FORMULA_TYPE_MISMATCH',
  UNKNOWN_FUNCTION: 'FORMULA_UNKNOWN_FUNCTION',
  UNKNOWN_PROPERTY: 'FORMULA_UNKNOWN_PROPERTY',
} as const satisfies Record<string, PageFormulaSaveErrorCode>;

export const PAGE_FORMULA_RUNTIME_ERROR = {
  DEPENDENCY_ERROR: 'FORMULA_DEPENDENCY_ERROR',
  DIVISION_BY_ZERO: 'FORMULA_DIVISION_BY_ZERO',
  INVALID_ARGUMENT: 'FORMULA_INVALID_ARGUMENT',
  ROLLUP_TARGET_UNAVAILABLE: 'ROLLUP_TARGET_UNAVAILABLE',
  WORK_LIMIT: 'FORMULA_WORK_LIMIT',
} as const satisfies Record<string, PageFormulaRuntimeErrorCode>;

export const PAGE_FORMULA_DATE_UNIT_VALUES = ['years', 'months', 'weeks', 'days', 'hours', 'minutes'] as const;
