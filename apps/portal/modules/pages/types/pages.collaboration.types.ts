import type { HocuspocusProvider } from '@hocuspocus/provider';
import type { Doc, XmlFragment } from 'yjs';

export type CollaborationStatus = 'connected' | 'connecting' | 'disconnected' | 'error' | 'reconnecting';

export interface PageCollaborationSession {
  readonly fragment: XmlFragment;
  readonly pageId: string;
  readonly provider: HocuspocusProvider;
  readonly ydoc: Doc;
}

export interface PageCollaborationResult {
  readonly session: PageCollaborationSession | null;
  readonly status: CollaborationStatus | null;
}
