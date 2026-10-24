import type { PageDateValue, PagePropertyOption, PagePropertyValues } from '../page-property/page-property.types.js';
import type { PageViewCalculation } from '../page-view/page-view.types.js';
import type { PagePropertyType } from '../types/page-schema.types.js';

export type PageFormulaType = 'BOOLEAN' | 'DATE' | 'LIST' | 'NUMBER' | 'TEXT';

export type PageFormulaSaveErrorCode =
  | 'FORMULA_CYCLE'
  | 'FORMULA_SYNTAX'
  | 'FORMULA_TOO_LARGE'
  | 'FORMULA_TYPE_MISMATCH'
  | 'FORMULA_UNKNOWN_FUNCTION'
  | 'FORMULA_UNKNOWN_PROPERTY';

export type PageFormulaRuntimeErrorCode =
  | 'FORMULA_DEPENDENCY_ERROR'
  | 'FORMULA_DIVISION_BY_ZERO'
  | 'FORMULA_INVALID_ARGUMENT'
  | 'FORMULA_WORK_LIMIT'
  | 'ROLLUP_TARGET_UNAVAILABLE';

/** A formula that cannot be saved: where it goes wrong, why, and which names it probably meant. */
export interface PageFormulaSaveError {
  readonly code: PageFormulaSaveErrorCode;
  readonly from: number;
  readonly message: string;
  readonly suggestions: readonly string[];
  readonly to: number;
}

/** What a cell shows when its value could not be computed. */
export interface PageFormulaCellError {
  readonly code: PageFormulaRuntimeErrorCode;
  readonly message: string;
}

export type PageFormulaScalar = boolean | number | PageDateValue | string;

/** A value a formula works with. `null` is an empty value, which most operations pass along. */
export type PageFormulaValue = PageFormulaScalar | readonly PageFormulaScalar[] | null;

export type PageFormulaOutcome =
  | { readonly error: PageFormulaCellError; readonly isOk: false }
  | { readonly isOk: true; readonly value: PageFormulaValue };

interface PageFormulaNodeSpan {
  readonly from: number;
  readonly to: number;
}

export type PageFormulaBinaryOperator =
  | '!='
  | '%'
  | '*'
  | '+'
  | '-'
  | '/'
  | '<'
  | '<='
  | '=='
  | '>'
  | '>='
  | 'and'
  | 'or';

export type PageFormulaNode =
  | (PageFormulaNodeSpan & {
      readonly kind: 'BINARY';
      readonly left: PageFormulaNode;
      readonly operator: PageFormulaBinaryOperator;
      readonly right: PageFormulaNode;
    })
  | (PageFormulaNodeSpan & {
      readonly arguments: readonly PageFormulaNode[];
      readonly kind: 'CALL';
      readonly name: string;
    })
  | (PageFormulaNodeSpan & { readonly kind: 'LITERAL'; readonly value: boolean | number | string })
  | (PageFormulaNodeSpan & {
      readonly kind: 'PROPERTY';
      /** Where the quoted name sits inside `prop(...)`, which is what a rename rewrites. */
      readonly labelFrom: number;
      readonly labelTo: number;
      readonly propertyKey: string;
    })
  | (PageFormulaNodeSpan & {
      readonly kind: 'UNARY';
      readonly operand: PageFormulaNode;
      readonly operator: '-' | 'not';
    });

/** A property as a formula sees it. A formula or rollup carries the type of its result. */
export interface PageFormulaPropertyInfo {
  readonly key: string;
  readonly label: string;
  readonly options: readonly PagePropertyOption[] | null;
  readonly resultType: PageFormulaType | null;
  readonly type: PagePropertyType;
}

/** What is stored in `config` of a formula property. */
export interface PageFormulaDefinition {
  readonly ast: PageFormulaNode;
  /** True when the value depends on the current time or on the viewer's time zone. */
  readonly isClockDependent: boolean;
  /** Keys of the properties the formula reads. */
  readonly references: readonly string[];
  readonly resultType: PageFormulaType;
  readonly source: string;
}

export type PageRollupCalculation = PageViewCalculation | 'SHOW_ORIGINAL';

/** What is stored in `config` of a rollup property. */
export interface PageRollupDefinition {
  readonly calculation: PageRollupCalculation;
  /** The relation of this collection whose rows are summed up. */
  readonly relationPropertyKey: string;
  readonly resultType: PageFormulaType;
  /** The collection the relation points to, kept here so the collections that read a property can be found. */
  readonly targetCollectionId: string;
  /** The property of the related collection that is read in each related row. */
  readonly targetPropertyKey: string;
}

/** The formula or rollup a property carries; a property of any other type carries neither. */
export interface PageComputedConfig {
  readonly formula: PageFormulaDefinition | null;
  readonly rollup: PageRollupDefinition | null;
}

export interface PageFormulaContext {
  readonly nowMilliseconds: number;
  readonly timeZone: string;
}

/** What a function may use while it runs: the clock and the zone, and the budget it spends from. */
export interface PageFormulaEnvironment {
  readonly context: PageFormulaContext;
  /** False once the budget cannot cover `steps` more. */
  readonly spend: (steps: number) => boolean;
}

export type PageFormulaRunner = (
  functionArguments: readonly PageFormulaValue[],
  environment: PageFormulaEnvironment,
) => PageFormulaOutcome;

export interface PageFormulaScope {
  readonly properties: ReadonlyMap<string, PageFormulaPropertyInfo>;
  /** The value another formula or rollup of the same row computed. */
  readonly readComputed: (propertyKey: string) => PageFormulaOutcome;
  readonly values: PagePropertyValues;
}
