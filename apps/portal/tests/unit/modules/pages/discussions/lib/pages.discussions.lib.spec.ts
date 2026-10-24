import { describe, expect, it } from 'bun:test';
import type { CommentView, DiscussionView } from '@neuma/shared';
import {
  groupDiscussionsByBlock,
  removeDiscussionFrom,
  replaceCommentIn,
  summarizeDiscussions,
  upsertDiscussion,
} from '@/modules/pages/discussions/lib/pages.discussions.lib';

const comment = (id: string, overrides: Partial<CommentView> = {}): CommentView => ({
  authorId: 'u-1',
  authorName: 'Ana',
  body: [{ insert: 'Hola' }],
  canDelete: true,
  canEdit: true,
  createdAt: '2026-10-20T10:00:00.000Z',
  discussionId: 'd-1',
  editedAt: null,
  id,
  isDeleted: false,
  ...overrides,
});

const discussion = (id: string, blockId: string, overrides: Partial<DiscussionView> = {}): DiscussionView => ({
  anchorMarkId: null,
  blockId,
  canComment: true,
  comments: [comment(`${id}-c1`, { discussionId: id })],
  createdAt: '2026-10-20T10:00:00.000Z',
  createdById: 'u-1',
  id,
  pageId: 'page-1',
  quote: null,
  resolvedAt: null,
  resolvedById: null,
  ...overrides,
});

describe('groupDiscussionsByBlock', () => {
  it('lists the discussions of each block, keeping their order', () => {
    const grouped = groupDiscussionsByBlock([
      discussion('d-1', 'b-1'),
      discussion('d-2', 'b-2'),
      discussion('d-3', 'b-1'),
    ]);

    expect(grouped.get('b-1')?.map((entry) => entry.id)).toEqual(['d-1', 'd-3']);
    expect(grouped.get('b-2')?.map((entry) => entry.id)).toEqual(['d-2']);
  });
});

describe('summarizeDiscussions', () => {
  it('counts the open discussions of each block and ignores the resolved ones', () => {
    const summary = summarizeDiscussions([
      discussion('d-1', 'b-1'),
      discussion('d-2', 'b-1', { resolvedAt: '2026-10-20T11:00:00.000Z' }),
      discussion('d-3', 'b-2'),
    ]);

    expect(summary.openCounts.get('b-1')).toBe(1);
    expect(summary.openCounts.get('b-2')).toBe(1);
  });

  it('names the marks of the open discussions that quote some words', () => {
    const summary = summarizeDiscussions([
      discussion('d-1', 'b-1', { anchorMarkId: 'd-1' }),
      discussion('d-2', 'b-1', { anchorMarkId: 'd-2', resolvedAt: '2026-10-20T11:00:00.000Z' }),
      discussion('d-3', 'b-1'),
    ]);

    expect([...summary.openMarkIds]).toEqual(['d-1']);
  });
});

describe('upsertDiscussion', () => {
  it('replaces a discussion it already has, in its place', () => {
    const before = [discussion('d-1', 'b-1'), discussion('d-2', 'b-2')];

    const after = upsertDiscussion(before, discussion('d-1', 'b-1', { resolvedAt: '2026-10-20T11:00:00.000Z' }));

    expect(after.map((entry) => entry.id)).toEqual(['d-1', 'd-2']);
    expect(after[0]?.resolvedAt).not.toBeNull();
  });

  it('adds a discussion it did not have, at the end', () => {
    const after = upsertDiscussion([discussion('d-1', 'b-1')], discussion('d-9', 'b-9'));

    expect(after.map((entry) => entry.id)).toEqual(['d-1', 'd-9']);
  });
});

describe('replaceCommentIn', () => {
  it('swaps the edited comment and leaves the rest', () => {
    const before = [discussion('d-1', 'b-1', { comments: [comment('c-1'), comment('c-2')] }), discussion('d-2', 'b-2')];

    const after = replaceCommentIn(before, comment('c-2', { body: [{ insert: 'Editado' }], editedAt: 'ahora' }));

    expect(after[0]?.comments[1]?.body).toEqual([{ insert: 'Editado' }]);
    expect(after[0]?.comments[0]?.body).toEqual([{ insert: 'Hola' }]);
    expect(after[1]).toBe(before[1]);
  });
});

describe('removeDiscussionFrom', () => {
  it('takes a discussion out by id', () => {
    const after = removeDiscussionFrom([discussion('d-1', 'b-1'), discussion('d-2', 'b-2')], 'd-1');

    expect(after.map((entry) => entry.id)).toEqual(['d-2']);
  });
});
