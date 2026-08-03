import type { UserRole } from '@company-brain/shared';
import type { Hocuspocus, WebSocketLike } from '@hocuspocus/server';

export interface CollaborationContext {
  readonly mode: 'read' | 'write';
  readonly pageId: string;
  readonly role: UserRole;
  readonly userId: string;
  readonly workspaceId: string;
}

export interface CollaborationTokenRequest {
  readonly mode: 'read' | 'write';
  readonly pageId: string;
}

export interface CollaborationPrincipal {
  readonly role: UserRole;
  readonly sub: string;
}

export interface CollaborationPageAccessResult {
  readonly getValue: () => { readonly lifecycle: 'ACTIVE' | 'TRASHED' };
  readonly isFail: () => boolean;
}

export interface CollaborationPageService {
  readonly getAccessible: (
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<CollaborationPageAccessResult>;
}

export interface CollaborationWorkspaceService {
  readonly resolveForUser: (userId: string, role: UserRole) => Promise<{ readonly id: string }>;
}

export interface CollaborationTokenSigner {
  readonly signCollaborationToken: (
    user: { readonly id: string; readonly role: UserRole },
    workspaceId: string,
    pageId: string,
    mode: 'read' | 'write',
  ) => Promise<string>;
}

export interface CollaborationTokenAdapter {
  readonly verify: (token: string) => Promise<CollaborationContext>;
}

export interface CollaborationAuthorizationAdapter {
  readonly authorize: (context: CollaborationContext, pageId: string, mode: 'read' | 'write') => Promise<boolean>;
}

export interface CollaborationPersistenceAdapter {
  readonly load: (documentName: string) => Promise<Uint8Array | null>;
  readonly store: (documentName: string, state: Uint8Array) => Promise<void>;
}

export interface CollaborationGatewayDependencies {
  readonly authorization: CollaborationAuthorizationAdapter;
  readonly persistence: CollaborationPersistenceAdapter;
  readonly token: CollaborationTokenAdapter;
}

export interface CollaborationGateway {
  readonly handleConnection: (socket: WebSocketLike, request: Request) => ReturnType<Hocuspocus['handleConnection']>;
  readonly server: Hocuspocus<CollaborationContext>;
  readonly validateDocumentName: (documentName: string) => string;
  readonly assertUpdateSize: (update: Uint8Array) => Promise<void>;
  readonly assertStateSize: (state: Uint8Array) => Promise<void>;
  readonly authorizeUpdate: (context: CollaborationContext, documentName: string, update: Uint8Array) => Promise<void>;
  readonly shutdown: () => Promise<void>;
}
