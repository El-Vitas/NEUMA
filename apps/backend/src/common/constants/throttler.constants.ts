export const THROTTLER_NAMES = {
  perIp: 'public-status-per-ip',
  global: 'public-status-global',
} as const;

export const PUBLIC_STATUS_RATE_LIMIT = {
  windowSeconds: 60,
  perIpLimit: 20,
  globalLimit: 300,
} as const;
