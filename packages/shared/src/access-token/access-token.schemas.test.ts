import { describe, expect, test } from 'bun:test';
import {
  ACCESS_TOKEN_PAGE_GRANT_LIMIT,
  ACCESS_TOKEN_PERMISSIONS,
  ACCESS_TOKEN_SPACE_GRANT_LIMIT,
} from './access-token.definitions.js';
import { accessTokenAccessSchema } from './access-token.schemas.js';

const read = ACCESS_TOKEN_PERMISSIONS.pagesRead;
const pageId = '0199a1c2-0000-7000-8000-000000000001';
const otherPageId = '0199a1c2-0000-7000-8000-000000000002';

const access = (overrides: Record<string, unknown>) => ({ allSpaces: [], pages: [], spaces: [], ...overrides });

describe('lo que se acepta como acceso de un token', () => {
  test('accepts permissions everywhere, per space, per page, or any mix', () => {
    expect(accessTokenAccessSchema.safeParse(access({ allSpaces: [read] })).success).toBe(true);
    expect(accessTokenAccessSchema.safeParse(access({ spaces: [{ permissions: [read], spaceId: 'a' }] })).success).toBe(
      true,
    );
    expect(accessTokenAccessSchema.safeParse(access({ pages: [{ pageId, permissions: [read] }] })).success).toBe(true);
  });

  test('accepts a space or a page with no permissions, as an exclusion', () => {
    const everythingButOneSpaceAndOnePage = access({
      allSpaces: [read],
      pages: [{ pageId, permissions: [] }],
      spaces: [{ permissions: [], spaceId: 'hr' }],
    });

    expect(accessTokenAccessSchema.safeParse(everythingButOneSpaceAndOnePage).success).toBe(true);
  });

  test('says what is wrong and where: a space named twice, a page named twice, or nothing given', () => {
    const issuesOf = (rules: Record<string, unknown>) =>
      accessTokenAccessSchema.safeParse(access(rules)).error?.issues.map((issue) => ({
        message: issue.message,
        path: issue.path,
      }));

    expect(
      issuesOf({
        allSpaces: [read],
        spaces: [
          { permissions: [read], spaceId: 'a' },
          { permissions: [], spaceId: 'a' },
        ],
      }),
    ).toEqual([{ message: 'Each space can have only one rule.', path: ['spaces'] }]);
    expect(
      issuesOf({
        allSpaces: [read],
        pages: [
          { pageId, permissions: [read] },
          { pageId, permissions: [] },
        ],
      }),
    ).toEqual([{ message: 'Each page can have only one rule.', path: ['pages'] }]);
    expect(issuesOf({})).toEqual([{ message: 'The token must give at least one permission somewhere.', path: [] }]);
  });

  test('refuses a token that can do nothing anywhere, exclusions or not', () => {
    expect(accessTokenAccessSchema.safeParse(access({})).success).toBe(false);
    expect(accessTokenAccessSchema.safeParse(access({ pages: [{ pageId, permissions: [] }] })).success).toBe(false);
  });

  test('refuses a permission the catalogue does not know', () => {
    expect(accessTokenAccessSchema.safeParse(access({ allSpaces: ['pages:delete-forever'] })).success).toBe(false);
  });

  test('refuses the same space or the same page named twice', () => {
    const spaceTwice = access({
      spaces: [
        { permissions: [read], spaceId: 'a' },
        { permissions: [], spaceId: 'a' },
      ],
    });
    const pageTwice = access({
      pages: [
        { pageId, permissions: [read] },
        { pageId, permissions: [] },
      ],
    });

    expect(accessTokenAccessSchema.safeParse(spaceTwice).success).toBe(false);
    expect(accessTokenAccessSchema.safeParse(pageTwice).success).toBe(false);
  });

  test('refuses a page named by something that is not a page id', () => {
    expect(
      accessTokenAccessSchema.safeParse(access({ pages: [{ pageId: "' OR 1=1 --", permissions: [read] }] })).success,
    ).toBe(false);
  });

  test('refuses more named spaces or pages than the limit', () => {
    const spaces = Array.from({ length: ACCESS_TOKEN_SPACE_GRANT_LIMIT + 1 }, (_unused, position) => ({
      permissions: [read],
      spaceId: `space-${String(position)}`,
    }));
    const pages = Array.from({ length: ACCESS_TOKEN_PAGE_GRANT_LIMIT + 1 }, (_unused, position) => ({
      pageId: `0199a1c2-0000-7000-8000-${String(position).padStart(12, '0')}`,
      permissions: [read],
    }));

    expect(accessTokenAccessSchema.safeParse(access({ spaces })).success).toBe(false);
    expect(accessTokenAccessSchema.safeParse(access({ allSpaces: [read], pages })).success).toBe(false);
  });

  test('keeps each permission once, however many times it came', () => {
    const parsed = accessTokenAccessSchema.parse(
      access({ allSpaces: [read, read], pages: [{ pageId: otherPageId, permissions: [read, read] }] }),
    );

    expect(parsed.allSpaces).toEqual([read]);
    expect(parsed.pages[0]?.permissions).toEqual([read]);
  });
});
