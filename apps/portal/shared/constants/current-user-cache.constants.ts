/**
 * What is kept about whoever is signed in.
 *
 * Named here rather than written where it is used, because the place that
 * remembers it and the place that changes it are different files, and a name
 * spelled twice is a name that can be spelled differently — which shows up as
 * a profile that keeps its old name after being renamed.
 */
export const CURRENT_USER_CACHE_TAG = 'current-user';
