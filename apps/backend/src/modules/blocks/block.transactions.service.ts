import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@neuma/shared';
import type { DomainError } from '../../common/domain/domain.error';
import { BlockCommitHub } from './block.commit.feed';
import { BLOCK_TRANSACTION_REPOSITORY } from './constants/block.transaction.constants';
import { BLOCK_REPOSITORY, BLOCK_TREE_MAX_DEPTH } from './constants/blocks.constants';
import { BlockAccessDeniedError } from './domain/block.error';
import { diffBlockLinks } from './domain/block.link.domain';
import { buildVersionNotification } from './domain/block.notification.domain';
import { planBlockTransaction } from './domain/block.transaction.domain';
import type { BlockOperation, BlockTransactionPlan } from './domain/block.transaction.domain.types';
import { BlockTransactionIdTakenError } from './domain/block.transaction.error';
import type {
  BlockOperationReader,
  BlockTransactionOutcome,
  BlockTransactionRepositoryContract,
  BlockTransactionRequest,
  BlockTransactionResult,
  BlockTransactionSession,
  BlockTransactionsResponse,
} from './types/block.transaction.types';
import type { BlockReader, BlockRepositoryContract } from './types/blocks.types';
import {
  hasParentWrite,
  listDestinationSpaceIds,
  listOperationBlockIds,
  listRootSpaceIds,
  listSpaceMoveRoots,
  parseBlockOperations,
  parseTrustedBlockOperations,
} from './utils/block.operation.utils';
import { blockTextEngine } from './utils/block.text.utils';

const toFailure = (id: string, error: DomainError): BlockTransactionOutcome => ({
  error: { code: error.code, details: error.details, message: error.message },
  id,
});

@Injectable()
export class BlockTransactionsService {
  constructor(
    @Inject(BLOCK_TRANSACTION_REPOSITORY) private readonly transactionRepository: BlockTransactionRepositoryContract,
    @Inject(BLOCK_REPOSITORY) private readonly blockRepository: BlockRepositoryContract,
    private readonly commitHub: BlockCommitHub,
  ) {}

  /**
   * Each client transaction stands alone: one that fails leaves nothing behind and does not stop the
   * next. They run one after another because a later one may build on what an earlier one wrote.
   */
  apply(requests: readonly BlockTransactionRequest[], reader: BlockReader): Promise<BlockTransactionsResponse> {
    return this.applyAll(requests, reader, parseBlockOperations);
  }

  /**
   * For the backend itself, never for a client: it also takes the page commands (trash, lock, verification, owner,
   * page values, move to another space), whose rules about who may do them live in the module that sends them.
   */
  applyTrusted(requests: readonly BlockTransactionRequest[], reader: BlockReader): Promise<BlockTransactionsResponse> {
    return this.applyAll(requests, reader, parseTrustedBlockOperations);
  }

  private async applyAll(
    requests: readonly BlockTransactionRequest[],
    reader: BlockReader,
    readOperations: BlockOperationReader,
  ): Promise<BlockTransactionsResponse> {
    const outcomes: BlockTransactionOutcome[] = [];
    for (const request of requests) {
      outcomes.push(await this.applyOne(request, reader, readOperations));
    }
    return { transactions: outcomes };
  }

  private async applyOne(
    request: BlockTransactionRequest,
    reader: BlockReader,
    readOperations: BlockOperationReader,
  ): Promise<BlockTransactionOutcome> {
    const parsed = readOperations(request.operations);
    if (parsed.isFail()) return toFailure(request.id, parsed.getError());
    const operations = parsed.getValue();
    const requiredSpaceIds = [request.spaceId, ...listDestinationSpaceIds(operations, request.spaceId)];
    const readableSpaceIds = await this.blockRepository.findReadableSpaceIds(requiredSpaceIds, reader);
    if (!requiredSpaceIds.every((spaceId) => readableSpaceIds.has(spaceId))) {
      return toFailure(request.id, new BlockAccessDeniedError());
    }
    const outcome = await this.transactionRepository.run((session) =>
      this.execute(session, request, operations, reader),
    );
    if (outcome.isFail()) return toFailure(request.id, outcome.getError());
    this.commitHub.publish({
      blockIds: outcome.getValue().blocks.map((block) => block.id),
      spaceId: request.spaceId,
      userId: reader.userId,
    });
    return outcome.getValue();
  }

  private async execute(
    session: BlockTransactionSession,
    request: BlockTransactionRequest,
    operations: readonly BlockOperation[],
    reader: BlockReader,
  ): Promise<Result<BlockTransactionResult, DomainError>> {
    const claim = await session.claim(request.id, reader.userId, request.spaceId);
    if (claim.kind === 'taken') return Result.fail(new BlockTransactionIdTakenError());
    if (claim.kind === 'replayed') return Result.ok(claim.result);
    if (hasParentWrite(operations)) await session.lockTreeMoves(request.spaceId);
    const branchIds = await session.listDescendantIds(listSpaceMoveRoots(operations));
    const load = await session.loadBlocks(
      [...listOperationBlockIds(operations), ...branchIds],
      listRootSpaceIds(operations, request.spaceId),
    );
    const planned = planBlockTransaction(
      {
        actor: { userId: reader.userId, workspaceRole: reader.role },
        extraReadableSpaceIds: listDestinationSpaceIds(operations, request.spaceId),
        isSpaceReadable: true,
        load,
        maxTreeDepth: BLOCK_TREE_MAX_DEPTH,
        now: new Date(),
        operations,
        spaceId: request.spaceId,
      },
      blockTextEngine,
    );
    if (planned.isFail()) return Result.fail(planned.getError());
    return Result.ok(await this.store(session, request, planned.getValue()));
  }

  /** Blocks first, then their links, then the result that a retry will read, then the notice that commits with them. */
  private async store(
    session: BlockTransactionSession,
    request: BlockTransactionRequest,
    plan: BlockTransactionPlan,
  ): Promise<BlockTransactionResult> {
    await session.writeBlocks(plan.writes);
    await session.writeSpaces(plan.spaceWrites);
    await session.rebindLinkSources(plan.rebinds);
    const storedLinks = await session.readLinks(plan.linkSourceIds);
    const wanted = plan.linkDrafts;
    await session.writeLinks(diffBlockLinks(storedLinks, wanted));
    const result = { blocks: plan.versions, id: request.id };
    await session.recordResult(result);
    await session.notify(buildVersionNotification(request.id, request.spaceId, plan.versions));
    return result;
  }
}
