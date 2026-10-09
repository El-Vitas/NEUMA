export interface PageSyncedReference {
  readonly blockId: string;
  readonly pageId: string;
  readonly position: number;
  readonly spaceId: string;
}

export interface PageEditorSyncedLabels {
  readonly lost: string;
  readonly source: string;
  readonly synced: string;
}
