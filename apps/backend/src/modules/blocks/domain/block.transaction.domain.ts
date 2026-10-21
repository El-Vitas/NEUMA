import { BLOCK_TYPE, parseBlockContent, Result, readBlockText } from '@neuma/shared';
import { indexById, resolveRoles } from '../../../common/domain/block-access.domain';
import type { DomainError } from '../../../common/domain/domain.error';
import { isSameJson } from '../../../common/domain/json.domain';
import { authorizePlacements, authorizeTargets } from './block.authorization.domain';
import type { BlockRecord } from './block.domain.types';
import { BlockAccessDeniedError, BlockTreeTooDeepError } from './block.error';
import { extractBlockLinkTargets } from './block.link.domain';
import { BLOCK_NO_RELATIONS, BLOCK_NO_RULES } from './block.operation.constants';
import { applyBlockOperation, createWorkingBlock, writeCreatedText } from './block.operation.domain';
import { applyPageOperation, expandPageOperations, isPageOperation } from './block.page-operation.domain';
import { checkPermissionsKeepAManager } from './block.permissions-lockout.domain';
import { applyRelationOperation, expandRelationOperations, isRelationOperation } from './block.relation.domain';
import { applyRootLists } from './block.root.domain';
import { findServerAssignedWrite } from './block.row-defaults.domain';
import type {
  AppliedOperations,
  AuthorizationInput,
  BlockLinkDraft,
  BlockOperation,
  BlockTextEngine,
  BlockTransactionInput,
  BlockTransactionPlan,
  BlockWrite,
  LinkSourceRebind,
  SettledBlock,
  WorkingBlock,
} from './block.transaction.domain.types';
import { BlockContentInvalidError, ServerAssignedPropertyError } from './block.transaction.error';
import { checkTreeInvariants, findSourcePageId } from './block.tree.domain';
import { planViewOperations } from './block.view-operation.domain';

/** A transaction that changes views names the nodes it adds; reaching this one is a mistake of the caller. */
const failToNameNodes = (): string => {
  throw new Error('A transaction that changes views must say how its filter nodes are named');
};

const indexWorking = (blocks: readonly WorkingBlock[]): Map<string, WorkingBlock> =>
  new Map(blocks.map((block) => [block.id, block]));

const buildAuthorization = (
  input: BlockTransactionInput,
  records: readonly BlockRecord[],
  before: ReadonlyMap<string, WorkingBlock>,
): AuthorizationInput => {
  const recordsById = indexById(records);
  const readableSpaceIds = new Set(input.isSpaceReadable ? [input.spaceId, ...input.extraReadableSpaceIds] : []);
  return {
    before,
    isSpaceReadable: input.isSpaceReadable,
    maxDepth: input.maxTreeDepth,
    recordsById,
    rolesById: resolveRoles({ readableSpaceIds, viewer: input.actor }, recordsById),
    spaceId: input.spaceId,
    viewer: input.actor,
  };
};

const applyOperations = (
  input: BlockTransactionInput,
  operations: readonly BlockOperation[],
  before: ReadonlyMap<string, WorkingBlock>,
  engine: BlockTextEngine,
): Result<AppliedOperations, DomainError> => {
  const after = new Map(before);
  const counts = new Map<string, number>();
  for (const operation of operations) {
    const next = applyOperation(after, operation, input, engine);
    if (next.isFail()) return Result.fail(next.getError());
    after.set(operation.blockId, next.getValue());
    counts.set(operation.blockId, (counts.get(operation.blockId) ?? 0) + 1);
  }
  return Result.ok({ after, counts });
};

const applyOperation = (
  blocks: ReadonlyMap<string, WorkingBlock>,
  operation: BlockOperation,
  input: BlockTransactionInput,
  engine: BlockTextEngine,
): Result<WorkingBlock, DomainError> => {
  if (operation.command === 'create') {
    const author = { now: input.now, spaceId: input.spaceId, userId: input.actor.userId };
    return writeCreatedText(createWorkingBlock(operation, author), engine);
  }
  const block = blocks.get(operation.blockId);
  if (block === undefined) return Result.fail(new BlockAccessDeniedError());
  if (operation.command === 'insertRoot' || operation.command === 'removeRoot') return Result.ok(block);
  if (isRelationOperation(operation)) return applyRelationOperation(block, operation);
  return isPageOperation(operation)
    ? applyPageOperation(block, operation, { now: input.now, userId: input.actor.userId })
    : applyBlockOperation(block, operation, engine);
};

const hasSameContent = (previous: WorkingBlock | undefined, next: WorkingBlock): boolean =>
  previous !== undefined &&
  previous.type === next.type &&
  previous.alive === next.alive &&
  previous.parentId === next.parentId &&
  isSameJson(previous.properties, next.properties) &&
  isSameJson(previous.format, next.format);

/**
 * Version, authorship and text are settled once per block, after all its operations. A block that only gained or
 * lost children keeps its content, so it is not parsed again: a row written before this rule must not stop a reorder.
 */
const settleBlock = (
  block: WorkingBlock,
  previous: WorkingBlock | undefined,
  operationCount: number,
  input: BlockTransactionInput,
): Result<SettledBlock, DomainError> => {
  const stamped: WorkingBlock = {
    ...block,
    editedAt: input.now,
    editedById: input.actor.userId,
    version: (previous?.version ?? 0) + operationCount,
  };
  if (hasSameContent(previous, block)) return Result.ok({ block: stamped, content: null });
  const parsed = parseBlockContent(block.type, block.properties, block.format);
  if (parsed.isFail()) return Result.fail(new BlockContentInvalidError(block.id, parsed.getError().issues));
  const content = parsed.getValue();
  return Result.ok({ block: { ...stamped, text: readBlockText(content) }, content });
};

const settleBlocks = (
  applied: AppliedOperations,
  before: ReadonlyMap<string, WorkingBlock>,
  input: BlockTransactionInput,
): Result<SettledBlock[], DomainError> => {
  const settled: SettledBlock[] = [];
  for (const [id, operationCount] of applied.counts) {
    const block = applied.after.get(id);
    if (block === undefined) continue;
    const result = settleBlock(block, before.get(id), operationCount, input);
    if (result.isFail()) return Result.fail(result.getError());
    settled.push(result.getValue());
  }
  return Result.ok(settled);
};

const countCreatedAncestors = (block: WorkingBlock, created: ReadonlyMap<string, WorkingBlock>): number => {
  let depth = 0;
  let parentId = block.parentId;
  while (parentId !== null && created.has(parentId) && depth <= created.size) {
    depth += 1;
    parentId = created.get(parentId)?.parentId ?? null;
  }
  return depth;
};

/** New blocks go in first and parents before children, because a child row references its parent row. */
const orderWrites = (settled: readonly SettledBlock[], before: ReadonlyMap<string, WorkingBlock>): BlockWrite[] => {
  const writes = settled.map(({ block }) => ({ block, isNew: !before.has(block.id) }));
  const created = new Map(writes.filter((write) => write.isNew).map((write) => [write.block.id, write.block]));
  const newest = writes
    .filter((write) => write.isNew)
    .toSorted(
      (first, second) => countCreatedAncestors(first.block, created) - countCreatedAncestors(second.block, created),
    );
  return [...newest, ...writes.filter((write) => !write.isNew)];
};

const draftLinks = (
  { block, content }: SettledBlock,
  recordsById: ReadonlyMap<string, BlockRecord>,
  maxDepth: number,
): BlockLinkDraft[] => {
  const sourcePageId = findSourcePageId(block.id, recordsById, maxDepth);
  if (content === null || !block.alive || sourcePageId === null) return [];
  return extractBlockLinkTargets(block.id, content).map((target) => ({
    kind: target.kind,
    sourceBlockId: block.id,
    sourcePageId,
    targetBlockId: target.targetBlockId,
  }));
};

/** A block moved under another page: the links its descendants send must name that page. */
const listRebinds = (
  settled: readonly SettledBlock[],
  before: ReadonlyMap<string, WorkingBlock>,
  recordsById: ReadonlyMap<string, BlockRecord>,
  maxDepth: number,
): LinkSourceRebind[] =>
  settled.flatMap(({ block }) => {
    const previous = before.get(block.id);
    const hasMoved = previous !== undefined && previous.parentId !== block.parentId;
    const sourcePageId = findSourcePageId(block.id, recordsById, maxDepth);
    return hasMoved && block.alive && block.type !== BLOCK_TYPE.page && sourcePageId !== null
      ? [{ rootBlockId: block.id, sourcePageId }]
      : [];
  });

/**
 * Every rule of one client transaction, on data already loaded and locked: who may write what, the operations
 * themselves, the shape of the tree, the content of each block, its links and the versions to report. It writes
 * nothing; a failure means nothing of the transaction may be stored.
 */
export const planBlockTransaction = (
  input: BlockTransactionInput,
  engine: BlockTextEngine,
): Result<BlockTransactionPlan, DomainError> => {
  const { context, isDepthExceeded, locked } = input.load;
  if (!input.isSpaceReadable) return Result.fail(new BlockAccessDeniedError());
  if (isDepthExceeded) return Result.fail(new BlockTreeTooDeepError(input.maxTreeDepth));
  const before = indexWorking(locked);
  const authorization = buildAuthorization(input, [...context, ...locked], before);
  const authorizedTargets = authorizeTargets(input.operations, authorization);
  if (authorizedTargets.isFail()) return Result.fail(authorizedTargets.getError());
  const viewPlan = planViewOperations({
    authorization,
    createId: input.createNodeId ?? failToNameNodes,
    operations: input.viewOperations ?? [],
    schemas: input.viewSchemas ?? new Map(),
    views: input.views ?? [],
  });
  if (viewPlan.isFail()) return Result.fail(viewPlan.getError());
  const related = expandRelationOperations(
    input.operations,
    before,
    input.relationSchemas ?? BLOCK_NO_RELATIONS,
    authorization,
  );
  if (related.isFail()) return Result.fail(related.getError());
  const expanded = expandPageOperations(related.getValue(), locked);
  const applied = applyOperations(input, expanded.operations, before, engine);
  if (applied.isFail()) return Result.fail(applied.getError());
  const { after, counts } = applied.getValue();
  const assignedKey = findServerAssignedWrite(before, after, input.guardedRules ?? BLOCK_NO_RULES);
  if (assignedKey !== null) return Result.fail(new ServerAssignedPropertyError(assignedKey));
  const touchedIds = [...counts.keys()];
  const createdRecords = [...after.values()]
    .filter((block) => !before.has(block.id))
    .map((block) => ({ ...block, permissions: null }));
  const placement = buildAuthorization(input, [...context, ...locked, ...createdRecords], before);
  const authorizedPlacements = authorizePlacements(
    after,
    touchedIds.filter((id) => !expanded.placedIds.has(id)),
    placement,
  );
  if (authorizedPlacements.isFail()) return Result.fail(authorizedPlacements.getError());
  const recordsById = indexById([...context, ...after.values()]);
  const treeChecked = checkTreeInvariants({ after, before, maxDepth: input.maxTreeDepth, recordsById, touchedIds });
  if (treeChecked.isFail()) return Result.fail(treeChecked.getError());
  const kept = checkPermissionsKeepAManager({
    after,
    maxDepth: input.maxTreeDepth,
    members: input.members,
    operations: input.operations,
    recordsById,
  });
  if (kept.isFail()) return Result.fail(kept.getError());
  const roots = applyRootLists(input.load.spaces, expanded.operations, before, after, touchedIds);
  if (roots.isFail()) return Result.fail(roots.getError());
  const settled = settleBlocks(applied.getValue(), before, input);
  if (settled.isFail()) return Result.fail(settled.getError());
  const blocks = settled.getValue();
  return Result.ok({
    linkDrafts: blocks.flatMap((block) => draftLinks(block, recordsById, input.maxTreeDepth)),
    linkSourceIds: blocks.filter(({ content }) => content !== null).map(({ block }) => block.id),
    rebinds: listRebinds(blocks, before, recordsById, input.maxTreeDepth),
    spaceWrites: roots.getValue(),
    versions: blocks.map(({ block }) => ({ id: block.id, version: block.version })),
    viewVersions: viewPlan.getValue().versions,
    viewWrites: viewPlan.getValue().writes,
    writes: orderWrites(blocks, before),
  });
};
