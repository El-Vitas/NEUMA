import type {
  PageFormulaContext,
  PageFormulaOutcome,
  PageFormulaPropertyInfo,
  PagePropertyValue,
  PagePropertyValues,
} from '@neuma/shared';
import type { SchemaPropertyDefinition } from '../../../common/domain/schema.domain.types';

export interface ComputedRowInput {
  readonly id: string;
  /** What the row stores plus what its block says (title, who made it and when). */
  readonly values: PagePropertyValues;
}

/** For each row, the cell of each computed property that was asked for. */
export type ComputedCells = ReadonlyMap<string, ReadonlyMap<string, PageFormulaOutcome>>;

export interface ComputedEvaluationInput {
  readonly context: PageFormulaContext;
  /** The properties to compute; all of them when absent. What they read is computed too. */
  readonly keys?: ReadonlySet<string> | undefined;
  readonly properties: readonly SchemaPropertyDefinition[];
  /** The property each rollup reads in the related collection. */
  readonly rollupTargets: ReadonlyMap<string, PageFormulaPropertyInfo>;
  /** For each rollup and row, the value of the target property in each related row the reader may see. */
  readonly rollupValues: ReadonlyMap<string, ReadonlyMap<string, readonly (PagePropertyValue | undefined)[]>>;
  readonly rows: readonly ComputedRowInput[];
}
