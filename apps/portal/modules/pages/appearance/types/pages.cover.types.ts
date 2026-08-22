import type { PageCoverValue } from '@company-brain/shared';

export type { PageCoverValue };

/**
 * Everything the cover can be asked to do, gathered in one place because two
 * parts of the page ask for it: the band that shows it and the menu that
 * changes it, which do not sit next to each other.
 */
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
