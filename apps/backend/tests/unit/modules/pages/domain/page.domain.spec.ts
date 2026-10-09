import { describe, expect, it } from 'bun:test';
import {
  collectDescendantIds,
  isPageAssignedTo,
  isPageMoveAllowed,
  pageTitleMatchesSearch,
} from '@/modules/pages/domain/page.domain';

const buildTwoRootPages = () => [
  { id: 'page-a', parentId: null, spaceId: 'space-a' },
  { id: 'page-b', parentId: null, spaceId: 'space-a' },
];

describe('page domain rules', () => {
  it('allows a root page to move below another page', () => {
    expect(isPageMoveAllowed('page-a', 'page-b', 'space-a', buildTwoRootPages())).toBe(true);
  });

  it('rejects moving a page below itself or one of its descendants', () => {
    const pages = [
      { id: 'page-a', parentId: null, spaceId: 'space-a' },
      { id: 'page-b', parentId: 'page-a', spaceId: 'space-a' },
      { id: 'page-c', parentId: 'page-b', spaceId: 'space-a' },
    ];

    expect(isPageMoveAllowed('page-a', 'page-a', 'space-a', pages)).toBe(false);
    expect(isPageMoveAllowed('page-a', 'page-c', 'space-a', pages)).toBe(false);
  });

  it('rejects a move to a missing parent', () => {
    expect(
      isPageMoveAllowed('page-a', 'missing-page', 'space-a', [{ id: 'page-a', parentId: null, spaceId: 'space-a' }]),
    ).toBe(false);
  });

  it('rejects a parent that does not live in the space the page is going to', () => {
    expect(
      isPageMoveAllowed('page-a', 'page-b', 'space-a', [
        { id: 'page-a', parentId: null, spaceId: 'space-a' },
        { id: 'page-b', parentId: null, spaceId: 'space-b' },
      ]),
    ).toBe(false);
  });

  it('allows a page to hang from a parent in the space it is being sent to', () => {
    expect(
      isPageMoveAllowed('page-a', 'page-b', 'space-b', [
        { id: 'page-a', parentId: null, spaceId: 'space-a' },
        { id: 'page-b', parentId: null, spaceId: 'space-b' },
      ]),
    ).toBe(true);
  });

  it('allows moving a page below a same-space parent', () => {
    expect(isPageMoveAllowed('page-a', 'page-b', 'space-a', buildTwoRootPages())).toBe(true);
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

describe('what counts as a page somebody was given', () => {
  it('reads a person property naming them', () => {
    expect(isPageAssignedTo({ owner: 'user-a' }, ['owner'], 'user-a')).toBe(true);
  });

  it('reads a person property holding several people', () => {
    expect(isPageAssignedTo({ reviewers: ['user-b', 'user-a'] }, ['reviewers'], 'user-a')).toBe(true);
  });

  it('ignores a value the schema does not call a person', () => {
    expect(isPageAssignedTo({ notes: 'user-a' }, ['owner'], 'user-a')).toBe(false);
  });

  it('says no when the property names somebody else', () => {
    expect(isPageAssignedTo({ owner: 'user-b' }, ['owner'], 'user-a')).toBe(false);
  });

  it('says no when the page carries no properties at all', () => {
    expect(isPageAssignedTo(null, ['owner'], 'user-a')).toBe(false);
  });

  it('says no when the collection has no person property', () => {
    expect(isPageAssignedTo({ owner: 'user-a' }, [], 'user-a')).toBe(false);
  });
});
