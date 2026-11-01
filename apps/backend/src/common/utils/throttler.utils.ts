/** The storage key of a named throttler for one tracker, shared by the HTTP guard and by the live socket. */
export const buildThrottlerKey = (throttlerName: string, tracker: string): string => `${throttlerName}:${tracker}`;
