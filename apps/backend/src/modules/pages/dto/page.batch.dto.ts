/** A page trashed by its selected parent's cascade counts as succeeded. */
export interface PageBatchOutcome {
  readonly failedIds: readonly string[];
  readonly succeededIds: readonly string[];
}
