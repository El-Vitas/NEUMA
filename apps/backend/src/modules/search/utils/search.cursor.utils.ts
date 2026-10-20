import { searchCursorSchema } from '../schemas/search.cursor.schemas';
import type { SearchCursor } from '../types/search.types';

export const encodeSearchCursor = (cursor: SearchCursor): string =>
  Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');

/** The cursor is unsigned client input; the schema is strict so a value Postgres rejects is not a server error. */
export const decodeSearchCursor = (value: string | undefined): SearchCursor | null => {
  if (value === undefined || value.length === 0) return null;
  try {
    const parsed = searchCursorSchema.safeParse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};
