import type {
  PortalPageBatchOutcome,
  PortalSidebarSelectionOutcomeSummary,
} from '../types/portal.sidebar.selection.types';

/** Whether a batch action needs to say "some of these did not go through", or simply that it worked. */
export const summarizePortalSidebarSelectionOutcome = (
  outcome: PortalPageBatchOutcome,
): PortalSidebarSelectionOutcomeSummary => ({
  failedCount: outcome.failedIds.length,
  kind: outcome.failedIds.length === 0 ? 'success' : 'partial',
  succeededCount: outcome.succeededIds.length,
});
