import { BLOCK_WRITE_RATE_LIMIT, THROTTLER_NAMES } from '../../../common/constants/throttler.constants';
import type { LiveAccessContext } from '../domain/block.live.domain.types';
import type { BlockLiveSettings, BlockLiveWriteThrottle } from '../types/block.live.types';
import { BLOCK_TREE_MAX_DEPTH } from './blocks.constants';

/** With no block ids to check there is nothing to read, and every block id is hidden. */
export const BLOCK_LIVE_EMPTY_ACCESS_CONTEXT: LiveAccessContext = {
  maxDepth: BLOCK_TREE_MAX_DEPTH,
  readableSpaceIdsByUserId: new Map(),
  rolesByUserId: new Map(),
  rowsById: new Map(),
};

export const BLOCK_LIVE_SETTINGS = 'BLOCK_LIVE_SETTINGS';

export const BLOCK_PRESENCE_STORE = 'BLOCK_PRESENCE_STORE';

export const BLOCK_LISTEN_CLIENT_FACTORY = 'BLOCK_LISTEN_CLIENT_FACTORY';

/** The listen connection sends itself a message here: if it does not come back, the connection is dead. */
export const BLOCK_LIVE_HEARTBEAT_CHANNEL = 'block_live_heartbeat';

export const BLOCK_LIVE_PATH = '/api/v1/blocks/live';

export const BLOCK_LIVE_APPLICATION_NAME_SETTING = 'application_name';

/** Names the listen connection in `pg_stat_activity`, so an operator can tell it apart from the pool. */
export const BLOCK_LIVE_APPLICATION_NAME = 'neuma-block-live';

export const BLOCK_LIVE_TOKEN_AUDIENCE = 'block-live';

export const BLOCK_LIVE_TOKEN_PURPOSE = 'block-live';

/** The token is used right after it is minted, to open the socket. */
export const BLOCK_LIVE_TOKEN_EXPIRES_IN = '1m';

export const BLOCK_LIVE_TOKEN_MAX_LENGTH = 2048;

/** The largest message that is not a request is an auth token; anything bigger is refused. */
export const BLOCK_LIVE_MAX_MESSAGE_BYTES = 4096;

/** The size of the body the HTTP endpoints accept (Fastify's default), so a transaction fits on both. */
export const BLOCK_LIVE_MAX_REQUEST_MESSAGE_BYTES = 1_048_576;

export const BLOCK_LIVE_REQUEST_ID_MAX_LENGTH = 64;

export const BLOCK_LIVE_MAX_SUBSCRIPTIONS_PER_CONNECTION = 50;

/** Views of many collections can be open on one page, each one following its collection. */
export const BLOCK_LIVE_MAX_COLLECTION_SUBSCRIPTIONS_PER_CONNECTION = 20;

/** A sidebar follows the tree of each space the person has open (ADR 030). */
export const BLOCK_LIVE_MAX_TREE_SUBSCRIPTIONS_PER_CONNECTION = 20;

export const BLOCK_LIVE_MAX_CONNECTIONS_PER_USER = 10;

/** A client that pings every 30 s and sends presence on every move stays far below this. */
export const BLOCK_LIVE_RATE_LIMIT = { maxMessages: 120, windowMs: 10_000 } as const;

const MILLISECONDS_PER_SECOND = 1000;

/** The same two named limits the HTTP endpoint enforces, in the milliseconds the throttler storage counts in. */
export const BLOCK_LIVE_WRITE_THROTTLES: readonly BlockLiveWriteThrottle[] = [
  {
    limit: BLOCK_WRITE_RATE_LIMIT.burstLimit,
    name: THROTTLER_NAMES.blockWritesBurst,
    ttlMs: BLOCK_WRITE_RATE_LIMIT.burstWindowSeconds * MILLISECONDS_PER_SECOND,
  },
  {
    limit: BLOCK_WRITE_RATE_LIMIT.perUserLimit,
    name: THROTTLER_NAMES.blockWrites,
    ttlMs: BLOCK_WRITE_RATE_LIMIT.windowSeconds * MILLISECONDS_PER_SECOND,
  },
];

export const BLOCK_LIVE_CLOSE_CODE = {
  goingAway: 1001,
  idle: 4408,
  /** The socket reached its maximum age: the client mints a fresh token and connects again. */
  reconnectRequired: 4410,
  messageTooBig: 1009,
  policyViolation: 1008,
  tooManyConnections: 4429,
  unauthorized: 4401,
} as const;

export const BLOCK_LIVE_SOCKET_OPEN_STATE = 1;

export const BLOCK_LIVE_DEFAULT_SETTINGS: BlockLiveSettings = {
  authTimeoutMs: 10_000,
  deliveryTimeoutMs: 20_000,
  heartbeatIntervalMs: 30_000,
  heartbeatTimeoutMs: 10_000,
  idleTimeoutMs: 90_000,
  keepAliveInitialDelayMs: 10_000,
  maxConnectionAgeMs: 3_600_000,
  presenceSweepIntervalMs: 5000,
  presenceTimeToLiveMs: 60_000,
  reconnectInitialDelayMs: 500,
  reconnectMaxDelayMs: 30_000,
};
