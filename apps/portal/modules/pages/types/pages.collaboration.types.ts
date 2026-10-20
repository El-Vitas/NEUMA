import type { CollaborationPresenceIdentity } from '@neuma/shared';

export type CollaborationStatus = 'connected' | 'connecting' | 'disconnected' | 'error' | 'exhausted' | 'reconnecting';

export interface PageCollaborationParticipant extends CollaborationPresenceIdentity {
  readonly clientId: number;
  readonly cursor: unknown;
}
