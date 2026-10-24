import type { Outbox, OutboxOptions, RejectedCause } from '../types/local-cache.types';

const sortByCreation = <Item extends { readonly createdAt: number }>(items: readonly Item[]): readonly Item[] =>
  items.toSorted((left, right) => left.createdAt - right.createdAt);

/**
 * The writes not yet answered by the server. A write is kept until it is answered; one the server refused moves to
 * a list of its own and stays there until the person decides, so no text is dropped on the way (ADR 029).
 */
export const createOutbox = ({ now, storage }: OutboxOptions): Outbox => ({
  append: storage.appendTransaction,
  discardRejected: storage.deleteRejected,
  listPending: async () => sortByCreation(await storage.listTransactions()),
  listRejected: async () =>
    (await storage.listRejected()).toSorted((left, right) => left.rejectedAt - right.rejectedAt),
  markRejected: async (id: string, cause: RejectedCause, message: string): Promise<void> => {
    const held = (await storage.listTransactions()).find((transaction) => transaction.id === id);
    if (held === undefined) return;
    await storage.rejectTransaction({ ...held, cause, message, rejectedAt: now() });
  },
  remove: storage.deleteTransaction,
  retryRejected: async (id: string): Promise<void> => {
    const held = (await storage.listRejected()).find((rejected) => rejected.id === id);
    if (held === undefined) return;
    const { cause: _cause, message: _message, rejectedAt: _rejectedAt, ...pending } = held;
    await storage.restoreTransaction(pending);
  },
});
