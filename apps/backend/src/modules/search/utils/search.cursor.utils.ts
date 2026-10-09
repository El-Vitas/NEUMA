import { searchCursorSchema } from '../schemas/search.cursor.schemas';
import type { SearchCursor } from '../types/search.types';

export const encodeSearchCursor = (cursor: SearchCursor): string =>
  Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');

/**
 * El cursor que vino de un resultado anterior, leído con forma. El cursor no va
 * firmado, así que viene de afuera: una fecha que JavaScript acepta pero
 * Postgres no terminaría en un error del servidor, y por eso se exige entera.
 */
export const decodeSearchCursor = (value: string | undefined): SearchCursor | null => {
  if (value === undefined || value.length === 0) return null;
  try {
    const parsed = searchCursorSchema.safeParse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};
