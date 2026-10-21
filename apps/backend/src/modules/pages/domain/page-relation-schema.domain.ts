import { DatabasePropertyType } from '@neuma/db';
import { buildPagePropertyKey, Result } from '@neuma/shared';
import type { SchemaPropertyDefinition } from '../../../common/domain/schema.domain.types';
import { PageSchemaDefinitionError } from './page.error';
import type {
  PageRelationMirror,
  PageSchemaSideEffects,
  RelationPlan,
  RelationPlanInput,
} from './page-schema.domain.types';

const isRelation = (property: SchemaPropertyDefinition): boolean => property.type === DatabasePropertyType.RELATION;

const refuse = (details: string) =>
  Result.fail<never, PageSchemaDefinitionError>(new PageSchemaDefinitionError(details));

const findStored = (stored: readonly SchemaPropertyDefinition[], key: string): SchemaPropertyDefinition | undefined =>
  stored.find((property) => property.key === key && isRelation(property));

/** A relation that was saved before keeps its target and its mirror: both are the server's to give. */
const checkKeptRelation = (
  property: SchemaPropertyDefinition,
  saved: SchemaPropertyDefinition,
): PageSchemaDefinitionError | null =>
  property.config.targetCollectionId === saved.config.targetCollectionId &&
  property.config.mirrorPropertyKey === saved.config.mirrorPropertyKey
    ? null
    : new PageSchemaDefinitionError(`${property.key} cannot change the collection it points to or its mirror`);

const listTakenKeys = (
  input: RelationPlanInput,
  targetId: string,
  planned: readonly PageRelationMirror[],
): readonly { readonly key: string }[] => [
  ...(input.targetSchemas.get(targetId) ?? []),
  ...(targetId === input.pageId ? input.definitions : []),
  ...planned.filter((mirror) => mirror.targetCollectionId === targetId),
];

/** Relations that go away leave the other side as a one-way relation that keeps its values. */
const listUnlinks = (input: RelationPlanInput): PageSchemaSideEffects['mirrorsToUnlink'] =>
  input.stored
    .filter(isRelation)
    .filter((saved) => !input.definitions.some((property) => property.key === saved.key))
    .flatMap((saved) =>
      saved.config.targetCollectionId === null || saved.config.mirrorPropertyKey === null
        ? []
        : [{ collectionId: saved.config.targetCollectionId, key: saved.config.mirrorPropertyKey }],
    );

/**
 * What saving the relations of a collection also does elsewhere: a new two-way relation adds its mirror to the other
 * collection, and a removed one lets the other side go one-way. The target of a relation must be a collection the
 * caller can open, and nothing the caller sends can name the mirror of a relation.
 */
export const planRelationChanges = (input: RelationPlanInput): Result<RelationPlan, PageSchemaDefinitionError> => {
  const mirrors: PageRelationMirror[] = [];
  const definitions: SchemaPropertyDefinition[] = [];
  for (const property of input.definitions) {
    if (!isRelation(property)) {
      definitions.push(property);
      continue;
    }
    const { mirrorPropertyKey, targetCollectionId } = property.config;
    const saved = findStored(input.stored, property.key);
    if (saved !== undefined) {
      const error = checkKeptRelation(property, saved);
      if (error !== null) return Result.fail(error);
      definitions.push(property);
      continue;
    }
    if (targetCollectionId === null || !input.targetSchemas.has(targetCollectionId)) {
      return refuse(`${property.key} points to a collection that cannot be related`);
    }
    if (mirrorPropertyKey !== null) return refuse(`${property.key} cannot name its own mirror`);
    if (!input.twoWayKeys.has(property.key)) {
      definitions.push(property);
      continue;
    }
    const mirrorKey = buildPagePropertyKey(input.collectionTitle, listTakenKeys(input, targetCollectionId, mirrors));
    mirrors.push({
      key: mirrorKey,
      label: input.collectionTitle,
      mirrorOfKey: property.key,
      targetCollectionId,
    });
    definitions.push({ ...property, config: { ...property.config, mirrorPropertyKey: mirrorKey } });
  }
  return Result.ok({ definitions, sideEffects: { mirrorsToCreate: mirrors, mirrorsToUnlink: listUnlinks(input) } });
};
