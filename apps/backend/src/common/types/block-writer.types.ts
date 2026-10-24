import type { NeumaTransaction } from '@neuma/db';
import type { UserRole } from '@neuma/shared';

/**
 * A transaction the caller holds and will commit. The notices for the live channel wait for that commit: the caller
 * runs what `deferPublish` collected once the transaction is over.
 */
export interface BlockWriteWithin {
  readonly deferPublish: (publish: () => void) => void;
  readonly transaction: NeumaTransaction;
}

/** One client transaction: operations in the wire shape of `POST /transactions`, applied all or nothing. */
export interface BlockWriteRequest {
  /** The write is refused, and nothing is changed, when a block is not at the version the caller read. */
  readonly expectedVersions?: readonly { readonly blockId: string; readonly version: number }[];
  readonly id: string;
  readonly operations: readonly unknown[];
  readonly spaceId: string;
}

export interface BlockWriteReader {
  readonly role: UserRole;
  readonly userId: string;
  readonly workspaceId: string;
}

export interface BlockWriteFailure {
  readonly code: string;
  readonly details?: unknown;
  readonly message: string;
}

export type BlockWriteOutcome =
  | { readonly blocks: readonly { readonly id: string; readonly version: number }[]; readonly id: string }
  | { readonly error: BlockWriteFailure; readonly id: string };

export interface BlockWriteResponse {
  readonly transactions: readonly BlockWriteOutcome[];
}

/** A client transaction that was committed: who wrote, in which space, and which blocks it touched. */
export interface BlockCommit {
  readonly blockIds: readonly string[];
  readonly spaceId: string;
  readonly userId: string;
}

export type BlockCommitListener = (commit: BlockCommit) => void;

/** Tells whoever subscribes about each transaction the blocks module commits, once it is committed. */
export interface BlockCommitFeed {
  readonly subscribe: (listener: BlockCommitListener) => () => void;
}

/** What the blocks module offers to the backend's own modules: the page commands are accepted too. */
export interface BlockWriter {
  readonly applyTrusted: (
    requests: readonly BlockWriteRequest[],
    reader: BlockWriteReader,
  ) => Promise<BlockWriteResponse>;
  /** Inside a transaction the caller holds: it commits or rolls back with the caller's, and is not retried. */
  readonly applyTrustedWithin: (
    requests: readonly BlockWriteRequest[],
    reader: BlockWriteReader,
    within: BlockWriteWithin,
  ) => Promise<BlockWriteResponse>;
}
