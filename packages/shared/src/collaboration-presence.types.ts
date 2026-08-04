export interface CollaborationPresenceIdentity {
  readonly color: string | null;
  readonly name: string;
}

export interface CollaborationPresenceState {
  readonly cursor: unknown;
  readonly user: CollaborationPresenceIdentity;
}
