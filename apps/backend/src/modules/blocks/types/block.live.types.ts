import type { WebsocketHandler } from '@fastify/websocket';
import type { Result, UserRole } from '@neuma/shared';
import type { BlockAccessDeniedError } from '../domain/block.error';
import type { BlockChainRow, MessageWindow, PresenceEntry, PresenceReport } from '../domain/block.live.domain.types';
import type { BlockLiveUnauthorizedError } from '../domain/block.live.error';
import type { BlockReader } from './blocks.types';

/** What a client may send. The schema that validates it is typed against this, so the two cannot drift. */
export type BlockLiveClientMessage =
  | { readonly token: string; readonly type: 'auth' }
  | { readonly pageId: string; readonly type: 'subscribe' }
  | { readonly pageId: string; readonly type: 'unsubscribe' }
  | { readonly blockId: string | null; readonly pageId: string; readonly type: 'presence' }
  | { readonly type: 'ping' };

export type BlockLivePresenceMessage = Extract<BlockLiveClientMessage, { type: 'presence' }>;

export type BlockLiveRawSocket = Parameters<WebsocketHandler>[0];

export type BlockLiveRawSocketMessage = ArrayBuffer | Buffer | Buffer[];

export interface BlockLiveSettings {
  /** A socket that has not authenticated by then is closed. */
  readonly authTimeoutMs: number;
  /** A socket that sends nothing for this long is closed; clients ping well inside it. */
  readonly idleTimeoutMs: number;
  /** The token is checked once, at connect; a socket older than this is closed so the next one needs a fresh token. */
  readonly maxConnectionAgeMs: number;
  readonly presenceSweepIntervalMs: number;
  readonly presenceTimeToLiveMs: number;
  readonly reconnectInitialDelayMs: number;
  readonly reconnectMaxDelayMs: number;
}

/** The part of a WebSocket the channel uses. The transport adapts the real socket to it. */
export interface BlockLiveSocket {
  readonly close: (code: number, reason: string) => void;
  readonly send: (text: string) => void;
}

export interface BlockLiveSocketHandler {
  readonly handleClose: () => void;
  readonly handleMessage: (text: string) => Promise<void>;
}

export type BlockLiveConnectionOpener = (socket: BlockLiveSocket) => BlockLiveSocketHandler;

/** One open socket. Its subscriptions map each page to the space it lives in. */
export interface BlockLiveConnection {
  ageTimer: ReturnType<typeof setTimeout> | null;
  deadlineTimer: ReturnType<typeof setTimeout> | null;
  readonly id: string;
  isClosed: boolean;
  messageWindow: MessageWindow;
  queue: Promise<void>;
  reader: BlockReader | null;
  readonly socket: BlockLiveSocket;
  readonly subscriptions: Map<string, string>;
}

export interface BlockLivePage {
  readonly spaceId: string;
}

export interface BlockLiveTokenVerifier {
  readonly verify: (token: string) => Promise<Result<BlockReader, BlockLiveUnauthorizedError>>;
}

export interface BlockLivePageAccess {
  readonly canReadBlockInPage: (reader: BlockReader, pageId: string, blockId: string) => Promise<boolean>;
  readonly resolvePageAccess: (
    reader: BlockReader,
    pageId: string,
  ) => Promise<Result<BlockLivePage, BlockAccessDeniedError>>;
}

export interface BlockLiveBroadcaster {
  readonly broadcastPresence: (pageId: string) => Promise<void>;
  readonly sendPresenceTo: (connectionId: string, pageId: string) => Promise<void>;
}

export interface BlockLiveLogger {
  readonly error: (context: object, message: string) => void;
}

/** The one seam for presence: a later multi-node store is another implementation of this. */
export interface BlockPresenceStore {
  /** Drops the entries past their expiry and names the pages that lost any. */
  readonly expire: (now: number) => readonly string[];
  readonly list: (pageId: string, now: number) => readonly PresenceEntry[];
  /** True when the connection had an entry on the page. */
  readonly remove: (pageId: string, connectionId: string) => boolean;
  /** Names the pages that lost an entry. */
  readonly removeConnection: (connectionId: string) => readonly string[];
  readonly set: (report: PresenceReport & { readonly pageId: string }, now: number) => void;
}

/** What the account of a user says now, which can differ from what its token said when the socket opened. */
export interface LiveAccount {
  readonly id: string;
  readonly isActive: boolean;
  readonly role: UserRole;
}

/** The readers as they are now: with their current role, and the users who can no longer connect. */
export interface RefreshedReaders {
  readonly readers: readonly BlockReader[];
  readonly unavailableUserIds: ReadonlySet<string>;
}

export interface BlockChainReader {
  readonly readAccounts: (userIds: readonly string[]) => Promise<readonly LiveAccount[]>;
  /** The rows of the seeds and of every ancestor above them, with no content. */
  readonly readChains: (seedIds: readonly string[]) => Promise<readonly BlockChainRow[]>;
}

export interface BlockVersionListenerHandlers {
  readonly onNotification: (payload: string) => void;
  /** The connection came back after being lost, so notifications in between may be missing. */
  readonly onRecovered: () => void;
}
