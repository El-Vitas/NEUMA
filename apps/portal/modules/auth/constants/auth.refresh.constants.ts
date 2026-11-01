/** Routing waits on this call for every page request, so a stuck backend must not hold the portal. */
export const REFRESH_REQUEST_TIMEOUT_MILLISECONDS = 5000;

/** Statuses by which the backend says the refresh token itself is no good; anything else is not a verdict. */
export const REFRESH_REJECTED_STATUSES: readonly number[] = [400, 401, 403];
