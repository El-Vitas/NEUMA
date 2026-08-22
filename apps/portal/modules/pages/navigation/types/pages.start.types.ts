export interface PagesStartResult {
  readonly isStarting: boolean;
  /** Makes an empty page in a space — under `parentId` when one is given — and opens it. */
  readonly startPage: (spaceId: string, parentId?: string | null) => void;
}
