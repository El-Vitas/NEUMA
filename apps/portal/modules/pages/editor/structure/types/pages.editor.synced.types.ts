/** Which block of which page a synced block is showing, and where it stands here. */
export interface PageSyncedReference {
  readonly blockId: string;
  readonly pageId: string;
  readonly position: number;
  readonly spaceId: string;
}

/** What a borrowed block says about itself: that it is borrowed, and where it lives. */
export interface PageEditorSyncedLabels {
  readonly lost: string;
  readonly source: string;
  readonly synced: string;
}
