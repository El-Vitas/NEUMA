import { z } from 'zod';

/** The values a collection row keeps for its schema properties; the page block schema checks the keys and sizes. */
export const migrationPropertyValuesSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
);
