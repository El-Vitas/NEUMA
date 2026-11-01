import { BLOCK_ROLE, BLOCK_TYPE, canReadBlock, PAGE_LIFECYCLE, PAGE_RELATION_MAX_ENTRIES, Result } from '@neuma/shared';
import type { DomainError } from '../../../common/domain/domain.error';
import { authorizeTargets } from './block.authorization.domain';
import { BLOCK_CANNOT_RELATE_MESSAGE } from './block.operation.constants';
import { placeChild } from './block.operation.domain';
import type {
  AuthorizationInput,
  BlockJsonObject,
  BlockOperation,
  BlockRelationOperation,
  RelationProperty,
  WorkingBlock,
} from './block.transaction.domain.types';
import {
  BlockOperationInvalidError,
  RelationLimitExceededError,
  RelationMirrorForbiddenError,
} from './block.transaction.error';

export const isRelationOperation = (operation: BlockOperation): operation is BlockRelationOperation =>
  operation.command === 'addRelation' || operation.command === 'removeRelation';

const isRecord = (value: unknown): value is BlockJsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readCell = (block: WorkingBlock, property: string): readonly string[] => {
  const values = block.properties.values;
  const cell = isRecord(values) ? values[property] : undefined;
  return Array.isArray(cell) ? cell.filter((entry): entry is string => typeof entry === 'string') : [];
};

const writeCell = (block: WorkingBlock, property: string, cell: readonly string[]): WorkingBlock => {
  const values = isRecord(block.properties.values) ? block.properties.values : {};
  const { [property]: _previous, ...others } = values;
  const written = cell.length === 0 ? others : { ...others, [property]: cell };
  return { ...block, properties: { ...block.properties, values: written } };
};

/** Applies one relation operation to the row it names: the cell keeps its order and never repeats a row. */
export const applyRelationOperation = (
  block: WorkingBlock,
  operation: BlockRelationOperation,
): Result<WorkingBlock, DomainError> => {
  const current = readCell(block, operation.property);
  if (operation.command === 'removeRelation') {
    return Result.ok(
      writeCell(
        block,
        operation.property,
        current.filter((id) => id !== operation.targetId),
      ),
    );
  }
  const placed = placeChild(current, operation.targetId, { anchorId: operation.afterId, side: 'after' });
  if (placed.length > PAGE_RELATION_MAX_ENTRIES) {
    return Result.fail(new RelationLimitExceededError(PAGE_RELATION_MAX_ENTRIES));
  }
  return Result.ok(writeCell(block, operation.property, placed));
};

const isRowOf = (row: WorkingBlock, collectionId: string): boolean =>
  row.type === BLOCK_TYPE.page && row.parentId === collectionId && row.alive && row.lifecycle === PAGE_LIFECYCLE.ACTIVE;

const findRelationProperty = (
  source: WorkingBlock,
  property: string,
  schemas: ReadonlyMap<string, readonly RelationProperty[]>,
): RelationProperty | null =>
  source.parentId === null ? null : (schemas.get(source.parentId)?.find((entry) => entry.key === property) ?? null);

/** A row the viewer cannot read answers like one that does not exist, so a relation never confirms a hidden row. */
const checkTarget = (
  operation: BlockRelationOperation,
  relation: RelationProperty,
  before: ReadonlyMap<string, WorkingBlock>,
  input: AuthorizationInput,
): Result<WorkingBlock | null, DomainError> => {
  const target = before.get(operation.targetId);
  const role = input.rolesById.get(operation.targetId) ?? BLOCK_ROLE.none;
  const isReachable = target !== undefined && canReadBlock(role) && target.spaceId === input.spaceId;
  if (operation.command === 'removeRelation') return Result.ok(isReachable ? target : null);
  if (!isReachable || !isRowOf(target, relation.targetCollectionId)) {
    return Result.fail(new BlockOperationInvalidError(BLOCK_CANNOT_RELATE_MESSAGE));
  }
  return Result.ok(target);
};

const buildMirror = (
  operation: BlockRelationOperation,
  relation: RelationProperty,
  target: WorkingBlock,
): BlockRelationOperation | null => {
  if (relation.mirrorPropertyKey === null) return null;
  const mirrored = {
    blockId: target.id,
    isMirror: true,
    property: relation.mirrorPropertyKey,
    targetId: operation.blockId,
  } as const;
  return operation.command === 'addRelation'
    ? { ...mirrored, afterId: null, command: 'addRelation' }
    : { ...mirrored, command: 'removeRelation' };
};

const authorizeMirror = (mirror: BlockRelationOperation, input: AuthorizationInput): Result<void, DomainError> => {
  const authorized = authorizeTargets([mirror], input);
  return authorized.isFail() ? Result.fail(new RelationMirrorForbiddenError(mirror.blockId)) : authorized;
};

const expandOne = (
  operation: BlockRelationOperation,
  before: ReadonlyMap<string, WorkingBlock>,
  schemas: ReadonlyMap<string, readonly RelationProperty[]>,
  input: AuthorizationInput,
): Result<BlockOperation[], DomainError> => {
  const source = before.get(operation.blockId);
  if (source === undefined) return Result.ok([operation]);
  const relation = findRelationProperty(source, operation.property, schemas);
  if (source.type !== BLOCK_TYPE.page || relation === null) {
    return Result.fail(new BlockOperationInvalidError(`The collection has no relation ${operation.property}`));
  }
  const target = checkTarget(operation, relation, before, input);
  if (target.isFail()) return Result.fail(target.getError());
  const mirrorTarget = target.getValue();
  const mirror = mirrorTarget === null ? null : buildMirror(operation, relation, mirrorTarget);
  if (mirror === null) return Result.ok([operation]);
  const authorized = authorizeMirror(mirror, input);
  return authorized.isFail() ? Result.fail(authorized.getError()) : Result.ok([operation, mirror]);
};

/**
 * Adds the other half of every two-way relation, once the row it lives on is known to be editable by the viewer.
 * A relation operation that cannot be placed (no such property, a row outside the target collection) fails here,
 * before anything is applied.
 */
export const expandRelationOperations = (
  operations: readonly BlockOperation[],
  before: ReadonlyMap<string, WorkingBlock>,
  schemas: ReadonlyMap<string, readonly RelationProperty[]>,
  input: AuthorizationInput,
): Result<BlockOperation[], DomainError> => {
  const expanded: BlockOperation[] = [];
  for (const operation of operations) {
    if (!isRelationOperation(operation) || operation.isMirror === true) {
      expanded.push(operation);
      continue;
    }
    const result = expandOne(operation, before, schemas, input);
    if (result.isFail()) return result;
    expanded.push(...result.getValue());
  }
  return Result.ok(expanded);
};
