import type { z } from 'zod';
import type { Outbox, RejectedCause } from '../../local-cache/types/local-cache.types';
import type { pageViewWriteSchema } from '../schemas/pages.view-writes.schemas';
import type { PagePropertyValue } from './pages.schema.types';

/** A change a view makes that the browser keeps until the server has answered it: a cell, a move, a new row. */
export type PageViewWrite = z.infer<typeof pageViewWriteSchema>;

/** What the server (or its absence) answered to one write. */
export type ViewWriteSendResult =
  | { readonly kind: 'applied' }
  | { readonly kind: 'offline' }
  | { readonly cause: RejectedCause; readonly kind: 'rejected'; readonly message: string };

/** What a caller learns of a write: it was applied, it waits for the network, or it was refused. */
export type ViewWriteSettled =
  | { readonly kind: 'applied' }
  | { readonly kind: 'queued' }
  | { readonly cause: RejectedCause; readonly kind: 'rejected'; readonly message: string };

/** What the views write through: kept on disk and shown at once, or sent now when the change needs the network. */
export interface PagesViewWrites {
  /** False when the browser would not give a disk: what is pending is lost with the tab. */
  readonly isPersistent: boolean;
  readonly pendingCount: number;
  /** The value a change not yet answered gives a cell: undefined when none does, null when it clears the cell. */
  readonly readPendingValue: (rowId: string, propertyKey: string) => null | PagePropertyValue | undefined;
  /** Kept on disk, shown at once and sent when the network allows. */
  readonly write: (write: PageViewWrite, description: string) => Promise<ViewWriteSettled>;
  /** Needs the network: with none it is refused as `offline`, and whoever asked undoes what they showed. */
  readonly writeNow: (write: PageViewWrite) => Promise<ViewWriteSettled>;
}

/** A write the queue holds, with the way to tell whoever asked for it what came of it. */
export interface ViewWriteQueueItem {
  readonly createdAt: number;
  readonly id: string;
  settle: ((answer: ViewWriteSettled) => void) | null;
  readonly write: PageViewWrite;
}

export interface ViewWriteQueueOptions {
  readonly collectionId: string;
  readonly newId: () => string;
  /** Told when a write the queue held is answered, whenever that happens: the caller may have stopped waiting. */
  readonly onAnswered?: (id: string, write: PageViewWrite, answer: ViewWriteSettled) => void;
  readonly outbox: Outbox;
  readonly ownerId: string;
  /** Sends again later; returns the way to cancel it. */
  readonly scheduleRetry: (run: () => void, attempt: number) => () => void;
  readonly send: (write: PageViewWrite) => Promise<ViewWriteSendResult>;
}

export interface ViewWriteQueue {
  /** Keeps the write on disk, then sends it after the ones before it. */
  readonly enqueue: (write: PageViewWrite, description: string) => Promise<ViewWriteSettled>;
  /** How many writes wait for the server, here or on disk from before. */
  readonly pendingCount: () => number;
  /** Reads what the disk still holds for this collection and sends everything pending. */
  readonly resume: () => Promise<void>;
  readonly subscribe: (listener: () => void) => () => void;
}
