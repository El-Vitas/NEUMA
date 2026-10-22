import type { BlockCollectionMessage } from '../../block-sync/types/block-sync.types';

export interface CollectionRefreshCoalescer {
  readonly cancel: () => void;
  readonly request: () => void;
}

/** What a view that follows the changes of its collection by itself says to the rest of the page. */
export type CollectionChangesMessage = Extract<BlockCollectionMessage, { type: 'collection-changes' }>;

/**
 * Between the live channel and the views. A view that can place the changes itself subscribes; when none does, or a
 * notice is not one a view can place, the page is drawn again from the server.
 */
export interface PagesCollectionNotices {
  /** A notice reached the page; it goes to the views that follow changes, or the page is drawn again. */
  readonly dispatch: (message: BlockCollectionMessage) => void;
  /** The view could not place a change and the page has to be drawn again; `reason` is logged. */
  readonly requestRefresh: (reason: string) => void;
  readonly subscribe: (listener: (message: CollectionChangesMessage) => void) => () => void;
  /**
   * The rows held of the collection may not be the ones the reader can see now (a change the server could not
   * describe, a lost connection, a lost access): a view that holds rows reads them again. `cause` is logged.
   */
  readonly subscribeStale: (listener: (cause: string) => void) => () => void;
}
