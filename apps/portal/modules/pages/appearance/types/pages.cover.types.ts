import type { PageCoverValue } from '@company-brain/shared';

export type { PageCoverValue };

export interface PagesCoverController {
  readonly cancelReposition: () => void;
  readonly cover: PageCoverValue | null;
  readonly isPending: boolean;
  readonly isRepositioning: boolean;
  readonly remove: () => void;
  readonly saveReposition: (position: number) => void;
  readonly startReposition: () => void;
  readonly upload: (file: File) => void;
}
