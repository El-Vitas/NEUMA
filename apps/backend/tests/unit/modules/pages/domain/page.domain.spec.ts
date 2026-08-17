import { describe, expect, it } from 'bun:test';
import { collectDescendantIds, isPageMoveAllowed, pageTitleMatchesSearch } from '@/modules/pages/domain/page.domain';

const buildTwoRootPages = () => [
  { id: 'page-a', parentId: null, spaceId: 'space-a' },
  { id: 'page-b', parentId: null, spaceId: 'space-a' },
];

describe('page domain rules', () => {
  it('allows a root page to move below another page', () => {
    expect(isPageMoveAllowed('page-a', 'page-b', buildTwoRootPages())).toBe(true);
  });

  it('rejects moving a page below itself or one of its descendants', () => {
    const pages = [
      { id: 'page-a', parentId: null, spaceId: 'space-a' },
      { id: 'page-b', parentId: 'page-a', spaceId: 'space-a' },
      { id: 'page-c', parentId: 'page-b', spaceId: 'space-a' },
    ];

    expect(isPageMoveAllowed('page-a', 'page-a', pages)).toBe(false);
    expect(isPageMoveAllowed('page-a', 'page-c', pages)).toBe(false);
  });

  it('rejects a move to a missing parent', () => {
    expect(isPageMoveAllowed('page-a', 'missing-page', [{ id: 'page-a', parentId: null, spaceId: 'space-a' }])).toBe(
      false,
    );
  });

  it('rejects moving a page below a parent in another space', () => {
    expect(
      isPageMoveAllowed('page-a', 'page-b', [
        { id: 'page-a', parentId: null, spaceId: 'space-a' },
        { id: 'page-b', parentId: null, spaceId: 'space-b' },
      ]),
    ).toBe(false);
  });

  it('allows moving a page below a same-space parent', () => {
    expect(isPageMoveAllowed('page-a', 'page-b', buildTwoRootPages())).toBe(true);
  });
});

describe('collectDescendantIds', () => {
  it('returns every page nested under the given page, at any depth', () => {
    const pages = [
      { id: 'page-a', parentId: null, spaceId: 'space-a' },
      { id: 'page-b', parentId: 'page-a', spaceId: 'space-a' },
      { id: 'page-c', parentId: 'page-b', spaceId: 'space-a' },
      { id: 'page-d', parentId: 'page-a', spaceId: 'space-a' },
      { id: 'page-unrelated', parentId: null, spaceId: 'space-a' },
    ];

    expect([...collectDescendantIds('page-a', pages)].sort()).toEqual(['page-b', 'page-c', 'page-d']);
  });

  it('returns an empty list for a page with no children', () => {
    const pages = [{ id: 'page-a', parentId: null, spaceId: 'space-a' }];

    expect(collectDescendantIds('page-a', pages)).toEqual([]);
  });

  it('returns an empty list for a page missing from the hierarchy', () => {
    expect(collectDescendantIds('missing-page', [])).toEqual([]);
  });
});

describe('pageTitleMatchesSearch', () => {
  it('matches case-insensitively on a partial title', () => {
    expect(pageTitleMatchesSearch('Quarterly Roadmap', 'roadmap')).toBe(true);
  });

  it('rejects a title that does not contain the search text', () => {
    expect(pageTitleMatchesSearch('Quarterly Roadmap', 'budget')).toBe(false);
  });

  it('matches everything when the search is empty, blank, or absent', () => {
    expect(pageTitleMatchesSearch('Quarterly Roadmap', '')).toBe(true);
    expect(pageTitleMatchesSearch('Quarterly Roadmap', '   ')).toBe(true);
    expect(pageTitleMatchesSearch('Quarterly Roadmap', null)).toBe(true);
  });
});
