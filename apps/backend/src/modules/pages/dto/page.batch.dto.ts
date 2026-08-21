/**
 * What a batch action reports back: which of the requested pages went through,
 * and which did not. A page trashed only because its selected mother carried
 * it along in her cascade counts as succeeded too — it is gone, exactly as asked.
 */
export interface PageBatchOutcome {
  readonly failedIds: readonly string[];
  readonly succeededIds: readonly string[];
}
