import type {
  PortalPageBatchOutcome,
  PortalSidebarSelectionOutcomeSummary,
} from '../types/portal.sidebar.selection.types';

export const summarizePortalSidebarSelectionOutcome = (
  outcome: PortalPageBatchOutcome,
): PortalSidebarSelectionOutcomeSummary => ({
  failedCount: outcome.failedIds.length,
  kind: outcome.failedIds.length === 0 ? 'success' : 'partial',
  succeededCount: outcome.succeededIds.length,
});
