import type { UserRole } from '@neuma/shared';

/** One client transaction: operations in the wire shape of `POST /transactions`, applied all or nothing. */
export interface BlockWriteRequest {
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
}
