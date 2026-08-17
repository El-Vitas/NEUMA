import { describe, expect, it } from 'bun:test';
import { buildPageTrashListQuerySuffix, buildPageTrashUrl } from '@/modules/pages/lib/pages.trash.lib';
import { ROUTES } from '@/shared/routes/constants/routes.constants';

describe('buildPageTrashUrl', () => {
  it('points at the trash screen with no query when the search is empty', () => {
    expect(buildPageTrashUrl('')).toBe(ROUTES.PORTAL_TRASH);
  });

  it('trims the search before deciding whether it is empty', () => {
    expect(buildPageTrashUrl('   ')).toBe(ROUTES.PORTAL_TRASH);
  });

  it('carries a non-empty search as an encoded query parameter', () => {
    expect(buildPageTrashUrl('roadmap notes')).toBe(`${ROUTES.PORTAL_TRASH}?search=roadmap%20notes`);
  });
});

describe('buildPageTrashListQuerySuffix', () => {
  it('is empty when neither a space nor a search was given', () => {
    expect(buildPageTrashListQuerySuffix()).toBe('');
  });

  it('carries the space alone', () => {
    expect(buildPageTrashListQuerySuffix('space-a')).toBe('?spaceId=space-a');
  });

  it('carries the space and the search together', () => {
    expect(buildPageTrashListQuerySuffix('space-a', 'roadmap')).toBe('?spaceId=space-a&search=roadmap');
  });

  it('drops an empty search instead of carrying an empty parameter', () => {
    expect(buildPageTrashListQuerySuffix('space-a', '')).toBe('?spaceId=space-a');
  });
});
