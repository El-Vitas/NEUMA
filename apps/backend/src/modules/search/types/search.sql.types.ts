import type { NeumaSqlTag } from '../../../prisma/types/prisma.types';
import type { decodeSearchCursor } from '../utils/search.cursor.utils';

export type SqlTemplate = ReturnType<NeumaSqlTag>;

export type SqlFragment = ReturnType<SqlTemplate['returns']>;

export type SearchCursorFilter = ReturnType<typeof decodeSearchCursor>;

export interface SearchExpressions {
  readonly match: SqlFragment;
  readonly queryInput: SqlFragment;
  readonly rank: SqlFragment;
  readonly snippet: SqlFragment;
}

export interface BlockExpressions {
  readonly match: SqlFragment;
  readonly rank: SqlFragment;
  readonly snippet: SqlFragment;
}
