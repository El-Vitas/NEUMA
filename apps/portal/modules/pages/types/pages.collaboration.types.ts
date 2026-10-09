import type { CollaborationPresenceIdentity } from '@company-brain/shared';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import type { Doc, XmlFragment } from 'yjs';

export type CollaborationStatus = 'connected' | 'connecting' | 'disconnected' | 'error' | 'exhausted' | 'reconnecting';

export interface PageCollaborationParticipant extends CollaborationPresenceIdentity {
  readonly clientId: number;
  readonly cursor: unknown;
}

export interface PageCollaborationDraft {
  readonly awareness: HocuspocusProvider['awareness'] | null;
  readonly fragment: XmlFragment;
}

export interface PageCollaborationSession {
  readonly fragment: XmlFragment;
  readonly pageId: string;
  readonly provider: HocuspocusProvider;
  readonly ydoc: Doc;
}

export interface PageCollaborationResult {
  readonly participants: readonly PageCollaborationParticipant[];
  readonly session: PageCollaborationSession | null;
  readonly status: CollaborationStatus | null;
}

export interface PageCollaborationSessionCallbacks {
  readonly onParticipantsChange: (participants: readonly PageCollaborationParticipant[]) => void;
  readonly onSessionChange: (session: PageCollaborationSession | null) => void;
  readonly onStatusChange: (status: CollaborationStatus) => void;
}

export interface PageCollaborationSessionOptions {
  readonly callbacks: PageCollaborationSessionCallbacks;
  readonly getDisplayName: () => string | null;
  readonly pageId: string;
}

export interface PageCollaborationSessionHandle {
  readonly destroy: () => void;
  readonly updateDisplayName: () => void;
}
