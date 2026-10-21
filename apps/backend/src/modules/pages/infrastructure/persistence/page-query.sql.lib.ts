import type { NeumaSqlTag } from '../../../../prisma/types/prisma.types';
import { SQL_FALSE, SQL_TRUE } from '../../constants/page-query.sql.constants';
import type { FragmentBuilder, SqlFragment, SqlParameter, SqlType } from '../../types/page-query.sql.types';

/** Text that is part of the statement itself. Only ever a literal written in this code base. */
export const sqlText = (text: string): SqlFragment => ({ parts: [text], values: [] });

/** A bound value with the type Postgres should read it as: an untyped parameter makes some operators ambiguous. */
export const sqlParameter = (value: SqlParameter, type: SqlType): SqlFragment => ({
  parts: ['', `::${type}`],
  values: [value],
});

const appendText = (builder: FragmentBuilder, text: string): void => {
  const last = builder.parts.length - 1;
  builder.parts[last] = `${builder.parts[last] ?? ''}${text}`;
};

const appendFragment = (builder: FragmentBuilder, fragment: SqlFragment): void => {
  const [first = '', ...rest] = fragment.parts;
  appendText(builder, first);
  builder.parts.push(...rest);
  builder.values.push(...fragment.values);
};

/** Writes a fragment: each interpolation is another fragment, spliced in place. */
export const frag = (strings: TemplateStringsArray, ...inserted: readonly SqlFragment[]): SqlFragment => {
  const builder: FragmentBuilder = { parts: [strings[0] ?? ''], values: [] };
  for (const [index, fragment] of inserted.entries()) {
    appendFragment(builder, fragment);
    appendText(builder, strings[index + 1] ?? '');
  }
  return builder;
};

export const joinSql = (fragments: readonly SqlFragment[], separator: string): SqlFragment => {
  const builder: FragmentBuilder = { parts: [''], values: [] };
  for (const [index, fragment] of fragments.entries()) {
    if (index > 0) appendText(builder, separator);
    appendFragment(builder, fragment);
  }
  return builder;
};

export const allOf = (fragments: readonly SqlFragment[]): SqlFragment =>
  fragments.length === 0 ? SQL_TRUE : frag`(${joinSql(fragments, ' AND ')})`;

export const anyOf = (fragments: readonly SqlFragment[]): SqlFragment =>
  fragments.length === 0 ? SQL_FALSE : frag`(${joinSql(fragments, ' OR ')})`;

export const negate = (fragment: SqlFragment): SqlFragment => frag`(NOT ${fragment})`;

export const sqlJson = (value: unknown): SqlFragment => sqlParameter(JSON.stringify(value), 'jsonb');

/** A list of texts as a `text[]`, sent as one JSON parameter: raw SQL binds no arrays. */
export const sqlTextList = (values: readonly string[]): SqlFragment =>
  frag`ARRAY(SELECT jsonb_array_elements_text(${sqlJson(values)}))`;

/** Hands the fragment to the driver's raw tag, which numbers the parameters. */
export const toRawStatement = (sqlTag: NeumaSqlTag, fragment: SqlFragment): ReturnType<NeumaSqlTag> => {
  const strings: TemplateStringsArray = Object.assign([...fragment.parts], { raw: [...fragment.parts] });
  return sqlTag(strings, ...fragment.values);
};
