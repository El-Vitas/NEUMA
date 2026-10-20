import type { PageContent } from '@neuma/shared';
import type { Selection } from 'prosemirror-state';
import type { SyncedBlock } from '../../block-sync/types/block-sync.types';
import type { PagePersonOption } from '../../collections/types/pages.schema.types';
import type { PagesAutosaveDisplayState } from '../../types/pages.autosave.types';
import type { CollaborationStatus, PageCollaborationParticipant } from '../../types/pages.collaboration.types';

/** What the editor shows of the block channel: who else is on the page and how the connection is. */
export interface PagesEditorBlockCollaboration {
  readonly participants: readonly PageCollaborationParticipant[];
  readonly status: CollaborationStatus | null;
}

export interface PagesEditorBlockBindingOptions {
  /** What the editor shows as saved while the binding is off. */
  readonly fallbackSaveState: PagesAutosaveDisplayState;
  /** The blocks the server rendered the page from; the binding is off while there are none. */
  readonly initialBlocks: readonly SyncedBlock[] | null | undefined;
  /** Whether the person can write in the page; a page that is only read still follows the channel, but never writes. */
  readonly isEnabled: boolean;
  readonly localUserId: string | null | undefined;
  /** Called when the channel says a discussion of this page changed. */
  readonly onDiscussionChanged?: () => void;
  readonly pageId: string;
  readonly personOptions: readonly PagePersonOption[];
  readonly readContent: () => PageContent;
  readonly replaceContent: (content: PageContent) => void;
  readonly spaceId: string;
}

export interface PagesEditorBlockBinding {
  /** The page can still be written in: it was writable, and the channel has not revoked it. */
  readonly canWrite: boolean;
  /** What the editor shows of the channel; null while the binding is off. */
  readonly collaboration: PagesEditorBlockCollaboration | null;
  readonly flush: () => Promise<boolean>;
  readonly isReadOnly: boolean;
  /** Hands a changed document to the block channel. */
  readonly keepContentLive: (content: PageContent) => void;
  readonly reportSelection: (selection: Selection) => void;
  readonly saveState: PagesAutosaveDisplayState;
}
