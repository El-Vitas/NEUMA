export interface PagesStartResult {
  readonly isStarting: boolean;
  readonly startCollection: (spaceId: string, parentId?: string | null) => void;
  readonly startPage: (spaceId: string, parentId?: string | null) => void;
}
