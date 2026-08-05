import { describe, expect, it } from 'bun:test';
import { DatabasePropertyType, DatabaseViewType } from '@company-brain/db';
import type { PagePropertyType, PageViewType } from '@company-brain/shared';
import { PAGE_PROPERTY_TYPE_VALUES, PAGE_VIEW_TYPE_VALUES } from '@company-brain/shared';

type IsExactUnion<PrismaMember extends string, SharedMember extends string> = [
  Exclude<PrismaMember, SharedMember>,
  Exclude<SharedMember, PrismaMember>,
] extends [never, never]
  ? true
  : false;

const pagePropertyTypeMatchesDatabasePropertyType: IsExactUnion<DatabasePropertyType, PagePropertyType> = true;
const pageViewTypeMatchesDatabaseViewType: IsExactUnion<DatabaseViewType, PageViewType> = true;

describe('page schema contract parity with Prisma enums', () => {
  it('keeps the shared PagePropertyType contract in sync with DatabasePropertyType', () => {
    expect(pagePropertyTypeMatchesDatabasePropertyType).toBe(true);
    expect([...PAGE_PROPERTY_TYPE_VALUES].sort()).toEqual(Object.values(DatabasePropertyType).sort());
  });

  it('keeps the shared PageViewType contract in sync with DatabaseViewType', () => {
    expect(pageViewTypeMatchesDatabaseViewType).toBe(true);
    expect([...PAGE_VIEW_TYPE_VALUES].sort()).toEqual(Object.values(DatabaseViewType).sort());
  });
});
