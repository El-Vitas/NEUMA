import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { BLOCK_TYPE, type BlockAccessHolder, Result } from '@neuma/shared';
import type { DomainError } from '../../common/domain/domain.error';
import type { BlockWriteWithin } from '../../common/types/block-writer.types';
import { BlockCommitHub } from './block.commit.feed';
import { BLOCK_TRANSACTION_REPOSITORY } from './constants/block.transaction.constants';
import { BLOCK_REPOSITORY, BLOCK_TREE_MAX_DEPTH } from './constants/blocks.constants';
import { BlockAccessDeniedError } from './domain/block.error';
import { diffBlockLinks } from './domain/block.link.domain';
import { buildVersionNotification } from './domain/block.notification.domain';
import { countNewRowsPerUniqueId, stampNewRows, toUniqueIdDemandKey } from './domain/block.row-defaults.domain';
import {
  findInvalidRowValue,
  findUnattachableFile,
  listCollectionsOfValueWrites,
  listRowFileIds,
  listRowValueWrites,
  writesPeople,
} from './domain/block.row-values.domain';
import { toAccessMembers } from './domain/block.sharing.domain';
import { planBlockTransaction } from './domain/block.transaction.domain';
import type {
  BlockLoad,
  BlockOperation,
  BlockTransactionPlan,
  CollectionRowRules,
} from './domain/block.transaction.domain.types';
import {
  BlockContentInvalidError,
  BlockTransactionIdTakenError,
  BlockVersionConflictError,
} from './domain/block.transaction.error';
import { findStaleBlock } from './domain/block.version.domain';
import { BlockSharingRepository } from './infrastructure/persistence/block.sharing.repository';
import type {
  BlockTransactionOutcome,
  BlockTransactionRepositoryContract,
  BlockTransactionRequest,
  BlockTransactionResult,
  BlockTransactionSession,
  BlockTransactionsResponse,
  BlockWriteChannel,
  ParsedOperations,
} from './types/block.transaction.types';
import type { BlockReader, BlockRepositoryContract } from './types/blocks.types';
import {
  hasParentWrite,
  listCollectionIds,
  listDestinationSpaceIds,
  listOperationBlockIds,
  listRootSpaceIds,
  listSpaceMoveRoots,
  parseBlockOperations,
  parseTrustedBlockOperations,
} from './utils/block.operation.utils';
import { blockTextEngine } from './utils/block.text.utils';
import { listViewIds, parseViewOperations, partitionOperations } from './utils/block.view-operation.utils';

/** Twelve characters name a node of a filter: enough to tell the few nodes of one view apart. */
const createNodeId = (): string => randomUUID().replaceAll('-', '').slice(0, 12);

/** A page created under another page may be a row of a collection: it joins the manual order of its views. */
const listNewRows = (writes: BlockTransactionPlan['writes']): { pageId: string; rowId: string }[] =>
  writes.flatMap(({ block, isNew }) =>
    isNew && block.type === BLOCK_TYPE.page && block.parentId !== null
      ? [{ pageId: block.parentId, rowId: block.id }]
      : [],
  );

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
    private readonly sharingRepository: BlockSharingRepository,
  ) {}

  /**
   * Each client transaction stands alone, as in Notion: one that fails leaves nothing behind and does not stop the
   * next. They run one after another because a later one may build on what an earlier one wrote.
   */
  apply(requests: readonly BlockTransactionRequest[], reader: BlockReader): Promise<BlockTransactionsResponse> {
    return this.applyAll(requests, reader, { guardsServerAssigned: true, readOperations: parseBlockOperations });
  }

  /**
   * For the backend itself, never for a client: it also takes the page commands (trash, lock, verification, owner,
   * page values, move to another space), whose rules about who may do them live in the module that sends them.
   */
  applyTrusted(requests: readonly BlockTransactionRequest[], reader: BlockReader): Promise<BlockTransactionsResponse> {
    return this.applyAll(requests, reader, {
      guardsServerAssigned: false,
      readOperations: parseTrustedBlockOperations,
    });
  }

  /**
   * The same as `applyTrusted`, inside a transaction the caller holds: what it writes commits or rolls back with the
   * caller's, which must roll back on any failure outcome. It is not retried here.
   */
  applyTrustedWithin(
    requests: readonly BlockTransactionRequest[],
    reader: BlockReader,
    within: BlockWriteWithin,
  ): Promise<BlockTransactionsResponse> {
    return this.applyAll(requests, reader, {
      guardsServerAssigned: false,
      readOperations: parseTrustedBlockOperations,
      within,
    });
  }

  private async applyAll(
    requests: readonly BlockTransactionRequest[],
    reader: BlockReader,
    channel: BlockWriteChannel,
  ): Promise<BlockTransactionsResponse> {
    const outcomes: BlockTransactionOutcome[] = [];
    for (const request of requests) {
      outcomes.push(await this.applyOne(request, reader, channel));
    }
    return { transactions: outcomes };
  }

  private async applyOne(
    request: BlockTransactionRequest,
    reader: BlockReader,
    channel: BlockWriteChannel,
  ): Promise<BlockTransactionOutcome> {
    const split = partitionOperations(request.operations);
    const parsed = channel.readOperations(split.blocks);
    if (parsed.isFail()) return toFailure(request.id, parsed.getError());
    const parsedViews = parseViewOperations(split.views);
    if (parsedViews.isFail()) return toFailure(request.id, parsedViews.getError());
    const operations = parsed.getValue();
    const viewOperations = parsedViews.getValue();
    const requiredSpaceIds = [request.spaceId, ...listDestinationSpaceIds(operations, request.spaceId)];
    const readableSpaceIds = await this.blockRepository.findReadableSpaceIds(requiredSpaceIds, reader);
    if (!requiredSpaceIds.every((spaceId) => readableSpaceIds.has(spaceId))) {
      return toFailure(request.id, new BlockAccessDeniedError());
    }
    const work = (session: BlockTransactionSession) =>
      this.execute(session, request, { operations, viewOperations }, reader, channel.guardsServerAssigned);
    const { within } = channel;
    const outcome =
      within === undefined
        ? await this.transactionRepository.run(work)
        : await this.transactionRepository.runWithin(within.transaction, work);
    if (outcome.isFail()) return toFailure(request.id, outcome.getError());
    const publish = (): void => {
      this.commitHub.publish({
        blockIds: outcome.getValue().blocks.map((block) => block.id),
        spaceId: request.spaceId,
        userId: reader.userId,
      });
    };
    if (within === undefined) publish();
    else within.deferPublish(publish);
    return outcome.getValue();
  }

  private async execute(
    session: BlockTransactionSession,
    request: BlockTransactionRequest,
    { operations, viewOperations }: ParsedOperations,
    reader: BlockReader,
    guardsServerAssigned: boolean,
  ): Promise<Result<BlockTransactionResult, DomainError>> {
    const claim = await session.claim(request.id, reader.userId, request.spaceId);
    if (claim.kind === 'taken') return Result.fail(new BlockTransactionIdTakenError());
    if (claim.kind === 'replayed') return Result.ok(claim.result);
    if (hasParentWrite(operations)) await session.lockTreeMoves(request.spaceId);
    const branchIds = await session.listDescendantIds(listSpaceMoveRoots(operations));
    const viewPageIds = await session.readViewPageIds(listViewIds(viewOperations));
    const collectionIds = [...new Set(viewPageIds.values())];
    const load = await session.loadBlocks(
      [...listOperationBlockIds(operations), ...branchIds, ...collectionIds],
      listRootSpaceIds(operations, request.spaceId),
    );
    const staleBlockId = findStaleBlock(request.expectedVersions, load.locked);
    if (staleBlockId !== null) return Result.fail(new BlockVersionConflictError(staleBlockId));
    const views = await session.lockViews(listViewIds(viewOperations));
    const viewSchemas = await session.readCollectionSchemas(collectionIds);
    const facts = await session.readCollectionFacts(listCollectionIds(operations, load.locked));
    const stamped = await this.stampNewRows(session, operations, facts.rules);
    const planned = planBlockTransaction(
      {
        actor: { userId: reader.userId, workspaceRole: reader.role },
        createNodeId,
        extraReadableSpaceIds: listDestinationSpaceIds(operations, request.spaceId),
        guardedRules: guardsServerAssigned ? facts.rules : undefined,
        isSpaceReadable: true,
        load,
        maxTreeDepth: BLOCK_TREE_MAX_DEPTH,
        members: await this.listHoldersWhenSettingPermissions(operations, request.spaceId, reader),
        now: new Date(),
        operations: stamped,
        relationSchemas: facts.relations,
        spaceId: request.spaceId,
        viewOperations,
        viewSchemas,
        views,
      },
      blockTextEngine,
    );
    if (planned.isFail()) return Result.fail(planned.getError());
    const attachments = guardsServerAssigned
      ? await this.checkRowValues(session, planned.getValue(), load, reader)
      : Result.ok(new Map<string, readonly string[]>());
    if (attachments.isFail()) return Result.fail(attachments.getError());
    const noticeSpaceIds = [request.spaceId, ...listDestinationSpaceIds(operations, request.spaceId)];
    const result = await this.store(session, request, planned.getValue(), noticeSpaceIds);
    await session.attachFilesToRows(attachments.getValue());
    return Result.ok(result);
  }

  /**
   * What a person writes into the columns of a row must be what the page API accepts there: an option of the column, a
   * member of the workspace, a file that is theirs to attach. The schemas of the collections are read once, and only
   * when the transaction changed values at all, so typing never pays for this. Returns the files the rows now hold.
   */
  private async checkRowValues(
    session: BlockTransactionSession,
    plan: BlockTransactionPlan,
    load: BlockLoad,
    reader: BlockReader,
  ): Promise<Result<ReadonlyMap<string, readonly string[]>, DomainError>> {
    const before = new Map(load.locked.map((block) => [block.id, block]));
    const collectionIds = listCollectionsOfValueWrites(plan.writes, before);
    if (collectionIds.length === 0) return Result.ok(new Map());
    const schemas = await session.readCollectionSchemas(collectionIds);
    const writes = listRowValueWrites(plan.writes, before, schemas);
    const personIds = writesPeople(writes, schemas)
      ? await session.listWorkspaceMemberIds(reader.workspaceId)
      : new Set<string>();
    const invalid = findInvalidRowValue(writes, schemas, personIds);
    if (invalid !== null) {
      const issues = [{ field: 'properties.values', message: invalid.message }];
      return Result.fail(new BlockContentInvalidError(invalid.rowId, issues));
    }
    const filesByRow = listRowFileIds(writes, schemas);
    const assets = await session.readActiveFiles([...new Set([...filesByRow.values()].flat())], reader.workspaceId);
    const refused = findUnattachableFile(filesByRow, assets, reader.userId);
    if (refused === null) return Result.ok(filesByRow);
    const issues = [{ field: 'properties.values', message: `The file ${refused} cannot be attached` }];
    const rowId = [...filesByRow].find(([, fileIds]) => fileIds.includes(refused))?.[0] ?? '';
    return Result.fail(new BlockContentInvalidError(rowId, issues));
  }

  /**
   * A row created in a collection starts on the default of each status and takes the next number of each unique id.
   * The counter moves in this transaction, so a transaction that fails hands out no number.
   */
  private async stampNewRows(
    session: BlockTransactionSession,
    operations: readonly BlockOperation[],
    rules: ReadonlyMap<string, CollectionRowRules>,
  ): Promise<BlockOperation[]> {
    const firstNumbers = new Map<string, number>();
    for (const demand of countNewRowsPerUniqueId(operations, rules)) {
      const first = await session.takeUniqueIds(demand.collectionId, demand.key, demand.count);
      firstNumbers.set(toUniqueIdDemandKey(demand.collectionId, demand.key), first);
    }
    return stampNewRows(operations, rules, firstNumbers);
  }

  /** Only a transaction that sets permissions needs to know who could still hold full access afterwards. */
  private async listHoldersWhenSettingPermissions(
    operations: readonly BlockOperation[],
    spaceId: string,
    reader: BlockReader,
  ): Promise<readonly BlockAccessHolder[] | undefined> {
    if (!operations.some((operation) => operation.command === 'setPermissions')) return undefined;
    const [members, spaceFacts] = await Promise.all([
      this.sharingRepository.listMembers(reader.workspaceId),
      this.sharingRepository.readSpaceFacts(spaceId),
    ]);
    if (spaceFacts === null) return [];
    return toAccessMembers(members, spaceFacts).map(({ canReadSpace, id, workspaceRole }) => ({
      canReadSpace,
      id,
      workspaceRole,
    }));
  }

  /**
   * Blocks first, then their links, then the result that a retry will read, then the notices that commit with them:
   * one for each space the change reaches, so the followers of a space a page moves into hear of it as well.
   */
  private async store(
    session: BlockTransactionSession,
    request: BlockTransactionRequest,
    plan: BlockTransactionPlan,
    noticeSpaceIds: readonly string[],
  ): Promise<BlockTransactionResult> {
    await session.writeBlocks(plan.writes);
    await session.writeViews(plan.viewWrites);
    await session.appendRowsToViewOrders(listNewRows(plan.writes));
    await session.writeSpaces(plan.spaceWrites);
    await session.rebindLinkSources(plan.rebinds);
    const storedLinks = await session.readLinks(plan.linkSourceIds);
    const wanted = plan.linkDrafts;
    await session.writeLinks(diffBlockLinks(storedLinks, wanted));
    const result = { blocks: plan.versions, id: request.id, views: plan.viewVersions };
    await session.recordResult(result);
    for (const spaceId of noticeSpaceIds) {
      await session.notify(buildVersionNotification(request.id, spaceId, plan.notices, plan.viewNotices));
    }
    return result;
  }
}
