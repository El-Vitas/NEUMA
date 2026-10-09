export const THROTTLER_NAMES = {
  perIp: 'credentials-per-ip',
  global: 'credentials-global',
  exports: 'exports-per-user',
  mcp: 'mcp-per-token',
  mcpPerIp: 'mcp-per-ip',
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
