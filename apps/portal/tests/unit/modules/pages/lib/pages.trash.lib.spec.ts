import { describe, expect, it } from 'bun:test';
import {
  buildPageTrashListQuerySuffix,
  buildPageTrashUrl,
  resolvePageRestoreNotice,
} from '@/modules/pages/trash/lib/pages.trash.lib';
import type { TrashRestoreOutcome } from '@/modules/pages/trash/types/pages.trash.types';
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

describe('resolvePageRestoreNotice', () => {
  const buildOutcome = (overrides: Partial<TrashRestoreOutcome> = {}): TrashRestoreOutcome => ({
    parentTitle: null,
    restoredChildCount: 0,
    restoredToRoot: false,
    spaceName: null,
    ...overrides,
  });

  it('names the space when the page landed at its root', () => {
    expect(resolvePageRestoreNotice(buildOutcome({ spaceName: 'Engineering' }))).toEqual({
      kind: 'toRoot',
      space: 'Engineering',
    });
  });

  it('names the parent when the page landed under one', () => {
    expect(resolvePageRestoreNotice(buildOutcome({ parentTitle: 'Product' }))).toEqual({
      kind: 'underParent',
      parent: 'Product',
    });
  });

  it('prefers the space over the parent when the outcome carries both', () => {
    expect(resolvePageRestoreNotice(buildOutcome({ parentTitle: 'Product', spaceName: 'Engineering' }))).toEqual({
      kind: 'toRoot',
      space: 'Engineering',
    });
  });

  it('falls back to a generic notice when the outcome names neither', () => {
    expect(resolvePageRestoreNotice(buildOutcome())).toEqual({ kind: 'restored' });
  });
});
