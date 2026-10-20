import type { ReactNode, PointerEvent as ReactPointerEvent } from 'react';
import type { AttachmentSummary } from '../../attachments/types/pages.attachments.types';
import type { SyncedBlock } from '../../block-sync/types/block-sync.types';
import type { PagePersonOption, PageSchema } from '../../collections/types/pages.schema.types';
import type { PageBacklinksResult } from '../../links/types/pages.backlinks.types';
import type { PageSummary } from '../../types/pages.types';

export interface PagesSidePanelController {
  readonly closePanel: () => Promise<void>;
  readonly handleWidthChange: (width: number) => void;
  readonly navigateWithinPanel: (spaceId: string, pageId: string) => void;
  readonly openPanel: (pageId: string) => void;
  readonly panelPageId: string | null;
  readonly startResizing: (event: ReactPointerEvent<HTMLInputElement>) => void;
  readonly width: number;
}

/** What the page route reads around a page, apart from the page's blocks. */
export interface PagesEditorBundle {
  readonly attachments: readonly AttachmentSummary[];
  readonly backlinks: PageBacklinksResult;
  readonly collectionSection: ReactNode;
  readonly embeddedCollections: Readonly<Record<string, ReactNode>>;
  readonly isFavorite: boolean;
  readonly page: PageSummary;
  readonly parentSchema: PageSchema | null;
  readonly personOptions: readonly PagePersonOption[];
}

export interface PagesSidePanelBundle extends PagesEditorBundle {
  /** The panel page's blocks as the server read them; null when they could not be read. */
  readonly blockSync: readonly SyncedBlock[] | null;
  readonly blockSyncFailed: boolean;
}
