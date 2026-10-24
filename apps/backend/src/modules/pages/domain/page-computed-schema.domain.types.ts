import type { PageComputedConfig, PageFormulaPropertyInfo, Result } from '@neuma/shared';
import type { SchemaPropertyDefinition } from '../../../common/domain/schema.domain.types';
import type { PageSchemaDefinitionError } from './page.error';
import type { ComputedDraft, RollupDependent, SchemaPropertyDraft } from './page-schema.domain.types';

export interface ComputedPlanInput {
  readonly collectionId: string;
  /** The schemas of the collections the rollups reach, following rollups of rollups. */
  readonly collections: ReadonlyMap<string, readonly SchemaPropertyDefinition[]>;
  readonly definitions: readonly SchemaPropertyDefinition[];
  readonly dependents: readonly RollupDependent[];
  readonly drafts: readonly SchemaPropertyDraft[];
  readonly stored: readonly SchemaPropertyDefinition[];
}

export type PlanResult = Result<readonly SchemaPropertyDefinition[], PageSchemaDefinitionError>;

export type RollupDraft = NonNullable<ComputedDraft['rollup']>;

export interface ComputedSource {
  readonly formula: string | null;
  readonly property: SchemaPropertyDefinition;
  readonly rollup: RollupDraft | null;
}

export interface Edge {
  readonly from: string;
  readonly to: readonly string[];
}

export interface Resolution {
  readonly definitions: ReadonlyMap<string, PageComputedConfig>;
  readonly resultTypes: ReadonlyMap<string, PageFormulaPropertyInfo['resultType']>;
}
