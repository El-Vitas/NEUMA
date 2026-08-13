import { describe, expect, test } from 'bun:test';
import { resolveLinkTargets } from '@/modules/links/domain/page-link.domain';

describe('resolveLinkTargets', () => {
  test('keeps every distinct mentioned page that is not the source page', () => {
    const targets = resolveLinkTargets('page-source', ['page-a', 'page-b']);

    expect(targets).toEqual(['page-a', 'page-b']);
  });

  test('excludes the source page when it mentions itself', () => {
    const targets = resolveLinkTargets('page-source', ['page-source', 'page-a']);

    expect(targets).toEqual(['page-a']);
  });

  test('returns nothing when a page only mentions itself', () => {
    const targets = resolveLinkTargets('page-source', ['page-source']);

    expect(targets).toEqual([]);
  });

  test('deduplicates repeated target ids', () => {
    const targets = resolveLinkTargets('page-source', ['page-a', 'page-a', 'page-b']);

    expect(targets).toEqual(['page-a', 'page-b']);
  });

  test('returns nothing for an empty mention list', () => {
    const targets = resolveLinkTargets('page-source', []);

    expect(targets).toEqual([]);
  });
});
