export const THROTTLER_NAMES = {
  perIp: 'credentials-per-ip',
  global: 'credentials-global',
} as const;

/**
 * How often credentials may be offered.
 *
 * These are the doors somebody knocks on without a session — signing in,
 * renewing a session, opening an account — so they are the doors that can be
 * knocked on all day by a machine. The per-address count stops one machine;
 * the shared count stops a thousand of them, since a list of addresses is
 * cheap and a guess is only worth making in bulk.
 */
export const CREDENTIAL_RATE_LIMIT = {
  windowSeconds: 60,
  perIpLimit: 20,
  globalLimit: 300,
} as const;
