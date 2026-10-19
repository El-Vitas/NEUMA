import type { Result } from '@neuma/shared';
import type { DomainError } from '../../../common/domain/domain.error';
import type {
  BlockLinkDiff,
  BlockLoad,
  BlockOperation,
  BlockVersion,
  BlockWrite,
  LinkSourceRebind,
  StoredBlockLink,
} from '../domain/block.transaction.domain.types';

export type BlockParsedOperation = Result<BlockOperation, DomainError>;

/** One position of a rich text: a UTF-16 unit of text or an embed, with the marks it carries. */
export interface BlockTextUnit {
  readonly attributes: Record<string, unknown> | undefined;
  readonly attributesKey: string;
  readonly key: string;
  readonly value: Record<string, unknown> | string;
}

export interface BlockInsertArgs {
  readonly anchorId: string | null;
  readonly childId: string;
}

/** What a client transaction left behind; it is also what a retry gets back. */
export interface BlockTransactionResult {
  readonly blocks: readonly BlockVersion[];
  readonly id: string;
}

export interface BlockTransactionRequest {
  readonly id: string;
  readonly operations: readonly unknown[];
  readonly spaceId: string;
}

export type BlockTransactionOutcome =
  | BlockTransactionResult
  | {
      readonly error: { readonly code: string; readonly details?: unknown; readonly message: string };
      readonly id: string;
    };

export interface BlockTransactionsResponse {
  readonly transactions: readonly BlockTransactionOutcome[];
}

export type BlockTransactionClaim =
  | { readonly kind: 'fresh' }
  | { readonly kind: 'replayed'; readonly result: BlockTransactionResult }
  | { readonly kind: 'taken' };

/** The statements of one Postgres transaction, called inside `run` in the order the service decides. */
export interface BlockTransactionSession {
  claim(transactionId: string, userId: string, spaceId: string): Promise<BlockTransactionClaim>;
  loadBlocks(blockIds: readonly string[]): Promise<BlockLoad>;
  lockTreeMoves(spaceId: string): Promise<void>;
  notify(payload: string): Promise<void>;
  readLinks(sourceBlockIds: readonly string[]): Promise<StoredBlockLink[]>;
  rebindLinkSources(rebinds: readonly LinkSourceRebind[]): Promise<void>;
  recordResult(result: BlockTransactionResult): Promise<void>;
  writeBlocks(writes: readonly BlockWrite[]): Promise<void>;
  writeLinks(diff: BlockLinkDiff): Promise<void>;
}

export interface BlockTransactionRepositoryContract {
  /** Commits when `work` returns a value and rolls everything back when it returns a failure. */
  run<Value>(
    work: (session: BlockTransactionSession) => Promise<Result<Value, DomainError>>,
  ): Promise<Result<Value, DomainError>>;
}
