import { z } from 'zod';

/** Dónde sigue una búsqueda: el puntaje, el momento y la fuente del último resultado entregado. */
export const searchCursorSchema = z.object({
  rank: z.number(),
  sourceId: z.string(),
  updatedAt: z.iso.datetime(),
});
