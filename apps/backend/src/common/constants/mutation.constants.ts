export const MUTATION_ID_HEADER = 'x-mutation-id';

/**
 * The shape a change has to name itself with.
 *
 * The name ends up inside the key that keeps a change from being recorded
 * twice, so a caller that sends nothing would have every one of its changes
 * share the same key — and the second change to the same page would collide
 * against the first and fail for a reason nobody could read.
 */
export const MUTATION_ID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
