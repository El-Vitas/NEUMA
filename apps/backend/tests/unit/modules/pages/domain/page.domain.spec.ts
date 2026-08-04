import { describe, expect, it } from 'bun:test';
import { isPageMoveAllowed } from '@/modules/pages/domain/page.domain';

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
