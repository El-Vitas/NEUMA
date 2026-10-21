import type { PagePropertyOptionDraft } from '@neuma/shared';
import type { SchemaPropertyDefinition } from '../../../common/domain/schema.domain.types';

/** What a caller sends for a formula or a rollup: the text of the formula, or the rollup in names of keys. */
export interface ComputedDraft {
  readonly formula: string | null;
  readonly rollup: {
    readonly calculation: string;
    readonly relationPropertyKey: string;
    readonly targetPropertyKey: string;
  } | null;
}

/** A rollup of another collection that reads a property of the collection being saved. */
export interface RollupDependent {
  readonly calculation: string;
  readonly collectionId: string;
  readonly key: string;
  readonly targetPropertyKey: string;
}

/** A property as a caller sends it: an option that is new has no id yet, and a relation may ask for its mirror. */
export interface SchemaPropertyDraft extends Omit<SchemaPropertyDefinition, 'computed' | 'options'> {
  /** Only a formula or a rollup sends it. Without it, the one the property already has is kept. */
  readonly computedDraft?: ComputedDraft | null | undefined;
  readonly options: readonly PagePropertyOptionDraft[] | null;
  /** On a relation that has no mirror yet: also create the property that points back from the other collection. */
  readonly twoWay: boolean;
}

/** The property to add to the other collection of a two-way relation, saved with the one that asks for it. */
export interface PageRelationMirror {
  readonly label: string;
  readonly key: string;
  readonly mirrorOfKey: string;
  readonly targetCollectionId: string;
}

/** What saving a shape also does to other collections: the mirrors it adds and the ones it lets go of. */
export interface PageSchemaSideEffects {
  readonly mirrorsToCreate: readonly PageRelationMirror[];
  readonly mirrorsToUnlink: readonly { readonly collectionId: string; readonly key: string }[];
}

export interface RelationPlanInput {
  /** The title of the collection being saved: the label of the mirror its relations leave on the other side. */
  readonly collectionTitle: string;
  readonly definitions: readonly SchemaPropertyDefinition[];
  readonly pageId: string;
  readonly stored: readonly SchemaPropertyDefinition[];
  /** The properties of each collection a relation may point to, for the ones the caller may open. */
  readonly targetSchemas: ReadonlyMap<string, readonly SchemaPropertyDefinition[]>;
  /** The relations that ask for a mirror on the other side. Only a relation that is new can ask. */
  readonly twoWayKeys: ReadonlySet<string>;
}

export interface RelationPlan {
  readonly definitions: readonly SchemaPropertyDefinition[];
  readonly sideEffects: PageSchemaSideEffects;
}
