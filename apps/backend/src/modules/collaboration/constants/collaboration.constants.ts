export const MAX_COLLABORATION_DOCUMENT_NAME_LENGTH = 80;
export const MAX_COLLABORATION_UPDATE_BYTES = 1_048_576;
export const MAX_COLLABORATION_STATE_BYTES = 10_485_760;
/** The largest update plus room for the protocol framing; the socket refuses anything bigger before reading it. */
export const MAX_COLLABORATION_MESSAGE_BYTES = MAX_COLLABORATION_UPDATE_BYTES + 262_144;
/** RFC 6455 close code for a message too big to process. */
export const MESSAGE_TOO_BIG_CLOSE_CODE = 1009;
export const MAX_COLLABORATION_AWARENESS_STATE_BYTES = 4096;
/** Below the 30 s the container gets to stop, so a slow save is logged instead of killed mid-write. */
export const COLLABORATION_SHUTDOWN_STORE_TIMEOUT_MS = 20_000;
export const COLLABORATION_SHUTDOWN_POLL_INTERVAL_MS = 50;
export const COLLABORATION_MODES = ['read', 'write'] as const;
export const COLLABORATION_PAGE_SERVICE = Symbol('COLLABORATION_PAGE_SERVICE');
export const COLLABORATION_WORKSPACE_SERVICE = Symbol('COLLABORATION_WORKSPACE_SERVICE');
export const COLLABORATION_TOKEN_SIGNER = Symbol('COLLABORATION_TOKEN_SIGNER');
