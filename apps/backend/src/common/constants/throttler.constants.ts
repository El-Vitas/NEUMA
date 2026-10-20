export const THROTTLER_NAMES = {
  perIp: 'credentials-per-ip',
  global: 'credentials-global',
  exports: 'exports-per-user',
  mcp: 'mcp-per-token',
  mcpPerIp: 'mcp-per-ip',
  blockWritesBurst: 'block-writes-burst',
  blockWrites: 'block-writes-per-user',
} as const;

/**
 * Live typing sends one transaction per batch of keystrokes, about 4 to 10 a second from a single editor.
 * The burst limit leaves room for a paste, a second tab and the retries after a reconnect; the minute limit holds
 * a person to the pace of fast typing (10 a second on average) and cuts a looping client. Counted per user.
 */
export const BLOCK_WRITE_RATE_LIMIT = {
  burstWindowSeconds: 1,
  burstLimit: 100,
  windowSeconds: 60,
  perUserLimit: 600,
} as const;

/** Unauthenticated endpoints: the per-IP limit stops one machine, the shared limit stops distributed guessing. */
export const CREDENTIAL_RATE_LIMIT = {
  windowSeconds: 60,
  perIpLimit: 20,
  globalLimit: 300,
} as const;

/** Export builds the whole archive in memory, the costliest request; counted per user. */
export const EXPORT_RATE_LIMIT = {
  windowSeconds: 60,
  perUserLimit: 5,
} as const;

/** Roomy for chained agent calls but cuts a looping agent; counted per token, not per user. */
export const MCP_RATE_LIMIT = {
  windowSeconds: 60,
  perTokenLimit: 120,
  // Counted before the token lookup so key guessing cannot hit the database unbounded.
  // High because an office shares one IP.
  perIpLimit: 600,
} as const;
