import { type PageCoverValue, type PageIcon, pageIconSchema } from '@neuma/shared';
import type { SchemaPropertyValue, SchemaPropertyValues } from '../../../common/domain/schema.domain.types';
import { isPropertyValue } from '../../../common/domain/schema-property.domain';
import { PAGE_FORMAT_KEY, PAGE_PROPERTY_KEY } from './page.block.domain.constants';
import { validatePageCover } from './page-cover.domain';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readEntry = (bag: unknown, key: string): unknown => (isRecord(bag) ? bag[key] : undefined);

/** A page without a title stores an empty list, not an empty segment. */
export const toPageTitleText = (title: string): { readonly insert: string }[] =>
  title === '' ? [] : [{ insert: title }];

/** The values a row keeps for its collection; an entry this version does not understand is left out. */
export const readPageValues = (properties: unknown): SchemaPropertyValues | null => {
  const values = readEntry(properties, PAGE_PROPERTY_KEY.values);
  if (!isRecord(values)) return null;
  const known: Record<string, SchemaPropertyValue> = {};
  for (const [key, entry] of Object.entries(values)) {
    if (isPropertyValue(entry)) known[key] = entry;
  }
  return known;
};

/** An icon that does not match the current shape reads as no icon instead of failing the page. */
export const readPageIcon = (format: unknown): PageIcon | null => {
  const icon = pageIconSchema.safeParse(readEntry(format, PAGE_FORMAT_KEY.icon));
  return icon.success ? icon.data : null;
};

export const readPageCover = (format: unknown): PageCoverValue | null => {
  const cover = validatePageCover(readEntry(format, PAGE_FORMAT_KEY.cover));
  return cover.isOk() ? cover.getValue() : null;
};
