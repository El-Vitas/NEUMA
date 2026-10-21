import { DatabasePropertyType } from '@neuma/db';
import type { EmptinessKind, SqlFragment, TextColumn } from '../types/page-query.sql.types';

export const SQL_TRUE: SqlFragment = { parts: ['TRUE'], values: [] };

export const SQL_FALSE: SqlFragment = { parts: ['FALSE'], values: [] };

/** The row being read. Every statement of a view query names the rows of the collection as this alias. */
export const ROW = 'b';

/** The alias of the positions of the rows in the order the view reads them by hand. */
export const POSITION = 'o';

/** Far above any real list of options, so the group always decides before the position does. */
export const GROUP_RANK_WEIGHT = 1_000_000;

/** An id the property no longer has goes after every option that exists. */
export const UNKNOWN_OPTION_RANK = 2_147_483_647;

export const FLAG_PRESENT = 0;

export const FLAG_EMPTY = 1;

export const ISO_INSTANT_FORMAT = 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"';

export const DAY_PATTERN = "'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'";

export const INSTANT_PATTERN = "'^[0-9]{4}-[0-9]{2}-[0-9]{2}T'";

export const DATE_PREFIX_PATTERN = "'^[0-9]{4}-[0-9]{2}-[0-9]{2}'";

export const COUNT_ALL: SqlFragment = { parts: ['count(*)'], values: [] };

export const NULLABLE_TEXT: TextColumn = { codecId: 'pg/text@1', nullable: true };

export const PLAIN_TEXT: TextColumn = { codecId: 'pg/text@1', nullable: false };

/** What Postgres answers when a statement is cancelled for taking longer than its limit. */
export const POSTGRES_QUERY_CANCELED = '57014';

export const EMPTINESS_BY_TYPE: Readonly<Record<DatabasePropertyType, EmptinessKind>> = {
  [DatabasePropertyType.CHECKBOX]: 'NEVER_EMPTY',
  [DatabasePropertyType.CREATED_BY]: 'BLANK_TEXT',
  [DatabasePropertyType.CREATED_TIME]: 'DATE_ABSENT',
  [DatabasePropertyType.DATE]: 'DATE_ABSENT',
  [DatabasePropertyType.EDITED_BY]: 'BLANK_TEXT',
  [DatabasePropertyType.EDITED_TIME]: 'DATE_ABSENT',
  [DatabasePropertyType.EMAIL]: 'BLANK_TEXT',
  [DatabasePropertyType.FILES]: 'EMPTY_LIST',
  [DatabasePropertyType.MULTI_SELECT]: 'EMPTY_LIST',
  [DatabasePropertyType.NUMBER]: 'NEVER_EMPTY',
  [DatabasePropertyType.PERSON]: 'EMPTY_LIST',
  [DatabasePropertyType.PHONE]: 'BLANK_TEXT',
  [DatabasePropertyType.RELATION]: 'EMPTY_LIST',
  [DatabasePropertyType.RICH_TEXT]: 'BLANK_TEXT',
  [DatabasePropertyType.SELECT]: 'BLANK_TEXT',
  [DatabasePropertyType.STATUS]: 'BLANK_TEXT',
  [DatabasePropertyType.TITLE]: 'BLANK_TEXT',
  [DatabasePropertyType.UNIQUE_ID]: 'NEVER_EMPTY',
  [DatabasePropertyType.URL]: 'BLANK_TEXT',
};
