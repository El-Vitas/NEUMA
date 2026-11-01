import type { NeumaSqlTag } from '../../../prisma/types/prisma.types';

export type SqlTemplate = ReturnType<NeumaSqlTag>;

export type SqlFragment = ReturnType<SqlTemplate['returns']>;

export interface MatchExpressions {
  readonly match: SqlFragment;
  readonly rank: SqlFragment;
  readonly snippet: SqlFragment;
}
