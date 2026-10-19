/** A probe hits readiness every minute; a database slower than this is reported as not ready. */
export const HEALTH_READINESS_TIMEOUT_MS = 2000;
export const DATABASE_HEALTH_CHECK = Symbol('DATABASE_HEALTH_CHECK');
