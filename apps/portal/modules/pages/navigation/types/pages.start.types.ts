export interface PagesStartResult {
  readonly isStarting: boolean;
  /**
   * Makes a page that keeps rows instead of writing, and opens it.
   *
   * It is the same page as any other, made the same way, and what it is given
   * on top is the shape a collection starts with — a name for each row, one
   * column, and one table to look at them.
   */
  readonly startCollection: (spaceId: string, parentId?: string | null) => void;
  /** Makes an empty page in a space — under `parentId` when one is given — and opens it. */
  readonly startPage: (spaceId: string, parentId?: string | null) => void;
}
