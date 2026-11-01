/** One recently edited block and the page that holds it, so the edit can be judged by what the reader may open. */
export interface RecentBlockEdit {
  readonly blockId: string;
  readonly editedAt: Date;
  readonly editedById: string;
  readonly pageId: string;
}

export interface RecentlyEditedPage {
  readonly editedAt: Date;
  readonly editedById: string;
  readonly id: string;
}
