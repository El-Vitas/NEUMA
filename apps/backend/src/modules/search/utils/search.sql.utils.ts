import type { NeumaSqlTag } from '../../../prisma/types/prisma.types';
import type { SqlFragment, SqlTemplate } from '../types/search.sql.types';

export const asBoolean = (template: SqlTemplate): SqlFragment => template.returns('pg/bool@1');

export const asText = (template: SqlTemplate): SqlFragment => template.returns('pg/text@1');

export const asDouble = (template: SqlTemplate): SqlFragment => template.returns('pg/float8@1');

export const asJson = (template: SqlTemplate): SqlFragment => template.returns('pg/jsonb@1');

/** Optional filters are plain conditions: an absent one is simply not in the list, and none at all means TRUE. */
export const allOf = (sql: NeumaSqlTag, conditions: readonly SqlFragment[]): SqlFragment =>
  conditions.reduce<SqlFragment>(
    (combined, condition) => asBoolean(sql`(${combined} AND ${condition})`),
    asBoolean(sql`TRUE`),
  );
