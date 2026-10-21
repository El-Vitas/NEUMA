import { DatabasePropertyType } from '@neuma/db';
import { getPagePropertyLogicalType, PAGE_PROPERTY_LOGICAL_TYPE } from '@neuma/shared';
import type { SchemaPropertyDefinition } from '../../../../common/domain/schema.domain.types';
import { ROW } from '../../constants/page-query.sql.constants';
import type { SqlFragment } from '../../types/page-query.sql.types';
import { storedCell, textOf } from './page-query.cell.sql';
import { frag, joinSql, sqlParameter, sqlText } from './page-query.sql.lib';

const escapeLike = (text: string): string =>
  text.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');

const containsWords = (haystack: SqlFragment, words: string): SqlFragment =>
  frag`("public"."immutable_unaccent"(${haystack}) ILIKE '%' || "public"."immutable_unaccent"(${sqlParameter(escapeLike(words), 'text')}) || '%')`;

/** The answers that are text: the title is the block's own text, and the title property holds nothing else. */
const isTextAnswer = (property: SchemaPropertyDefinition): boolean =>
  property.type !== DatabasePropertyType.TITLE &&
  getPagePropertyLogicalType(property.type) === PAGE_PROPERTY_LOGICAL_TYPE.TEXT;

/**
 * Rows whose title, or whose text answers (rich text, link, email, phone), say the words, ignoring case and accents.
 * They are read as one text joined by spaces, as the screen did, which also costs one unaccent per row.
 * Numbers, dates and the names of options are not searched: typing "3" would match half of the collection.
 */
export const searchSql = (words: string, properties: readonly SchemaPropertyDefinition[]): SqlFragment => {
  const texts = [
    sqlText(`"${ROW}"."text"`),
    ...properties.filter(isTextAnswer).map((property) => textOf(storedCell(property.key))),
  ];
  return containsWords(frag`concat_ws(' ', ${joinSql(texts, ', ')})`, words);
};
