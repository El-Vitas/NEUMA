/**
 * Every action of the collections, answering nothing. A view reaches them all through its writes, so a test that
 * replaces the module names the ones it watches over these.
 */
export const COLLECTION_ACTION_STUBS = {
  applyPageViewOperationsAction: async () => ({ data: null }),
  changePageRowRelationAction: async () => ({ data: 'CHANGED' }),
  createPageCollectionAction: async () => ({ data: null }),
  listPageRelationCandidatesAction: async () => ({ data: [] }),
  loadMorePageRowsAction: async () => ({ data: null }),
  movePageRowAction: async () => ({ data: null }),
  readEveryPageRowAction: async () => ({ data: null }),
  readPageCollectionAction: async () => ({ data: null }),
  readPageCollectionChangesAction: async () => ({ data: null }),
  readPageMatchingRowsAction: async () => ({ data: null }),
  readPageUndatedCountAction: async () => ({ data: null }),
  readRevokedRowsAction: async () => ({ data: [] }),
  readPageViewAggregatesAction: async () => ({ data: null }),
  refreshPageCollectionAction: async () => ({ data: null }),
  refreshPageRowsAction: async () => ({ data: null }),
  rewritePageCollectionOptionAction: async () => ({ data: null }),
  updatePageCollectionAction: async () => ({ data: null }),
  updatePageRowPropertiesAction: async () => ({ data: null }),
};

/** The actions on pages that a view reaches: creating a row, and what the selection bar does. */
export const PAGE_ACTION_STUBS = {
  createPageAction: async () => ({ data: { id: 'row-new' } }),
  duplicatePageAction: async () => ({ data: { id: 'row-copy' } }),
  reorderPageAction: async () => ({ data: null }),
  restorePageAction: async () => ({ data: null }),
  trashPageAction: async () => ({ data: null }),
};
