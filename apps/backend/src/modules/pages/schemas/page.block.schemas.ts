import { z } from 'zod';

/** The ids a block lists as its children. */
export const pageChildrenSchema = z.array(z.string());

/** A value is written to a JSON column only after it was checked to be JSON, whatever its in-memory type said. */
export const pageStoredJsonSchema = z.json();
