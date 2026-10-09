export const MUTATION_ID_HEADER = 'x-mutation-id';

/** The id is part of the idempotency key; without it a second change to a page would collide with the first. */
export const MUTATION_ID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
