import type { PageRow } from './pages.schema.types';

/**
 * The rows of one collection as this browser holds them, by id. A view that reads a row subscribes to that row alone,
 * so a change repaints one card or one line and not the whole view (ADR 029).
 */
export interface PageRowStore {
  readonly getRow: (id: string) => PageRow | undefined;
  /** Rises with every change; what a reader compares to know it must read again. */
  readonly getVersion: () => number;
  /** In the order the rows were first held, or the order of the last whole list. */
  readonly listRows: () => readonly PageRow[];
  /** Puts a row beside another in the order the store keeps; nothing changes if either is not held. */
  readonly moveRow: (id: string, anchor: { readonly after?: string; readonly before?: string }) => void;
  readonly removeRows: (ids: readonly string[]) => void;
  /** The list is the truth: rows it does not name are forgotten. */
  readonly replaceAll: (rows: readonly PageRow[]) => void;
  readonly subscribe: (listener: () => void) => () => void;
  readonly subscribeRow: (id: string, listener: () => void) => () => void;
  readonly upsertRows: (rows: readonly PageRow[]) => void;
}
