export interface PortalSidebarPageSelectionController {
  readonly announcement: string;
  readonly clearSelection: () => void;
  readonly isActive: boolean;
  readonly selectedIds: ReadonlySet<string>;
  readonly start: () => void;
  readonly stop: () => void;
  readonly toggle: (pageId: string) => void;
}

export interface PortalPageBatchOutcome {
  readonly failedIds: readonly string[];
  readonly succeededIds: readonly string[];
}

export type PortalSidebarSelectionOutcomeKind = 'partial' | 'success';

export interface PortalSidebarSelectionOutcomeSummary {
  readonly failedCount: number;
  readonly kind: PortalSidebarSelectionOutcomeKind;
  readonly succeededCount: number;
}
