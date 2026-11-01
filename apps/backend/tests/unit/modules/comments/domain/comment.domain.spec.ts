import { describe, expect, it } from 'bun:test';
import { BLOCK_ROLE, COMMENT_MENTIONS_MAX, COMMENT_TEXT_MAX_LENGTH, USER_ROLE } from '@neuma/shared';
import {
  canCommentOnBlock,
  canDeleteComment,
  canEditComment,
  canSeeDiscussions,
  parseCommentBody,
  planCommentNotifications,
  readDiscussionQuote,
} from '@/modules/comments/domain/comment.domain';

const ANA_ID = '0192f3a0-7c1e-7d2a-9b4e-3f5a6b7c8d9e';
const LUIS_ID = '0192f3a0-7c1e-7d2a-9b4e-3f5a6b7c8d9f';
const MARTA_ID = '0192f3a0-7c1e-7d2a-9b4e-3f5a6b7c8da0';

const mention = (userId: string, label: string) => ({ insert: { person: { label, userId } } });

describe('who may comment', () => {
  it('lets a block editor comment but not a block reader', () => {
    expect(canCommentOnBlock(BLOCK_ROLE.editor)).toBe(true);
    expect(canCommentOnBlock(BLOCK_ROLE.full)).toBe(true);
    expect(canCommentOnBlock(BLOCK_ROLE.reader)).toBe(false);
    expect(canCommentOnBlock(BLOCK_ROLE.none)).toBe(false);
  });

  it('lets anyone who can read the block see its discussions', () => {
    expect(canSeeDiscussions(BLOCK_ROLE.reader)).toBe(true);
    expect(canSeeDiscussions(BLOCK_ROLE.none)).toBe(false);
  });
});

describe('who may edit or delete a comment', () => {
  const live = { authorId: ANA_ID, deletedAt: null };

  it('lets only the author edit', () => {
    expect(canEditComment({ role: USER_ROLE.WORKER, userId: ANA_ID }, live)).toBe(true);
    expect(canEditComment({ role: USER_ROLE.ADMIN, userId: LUIS_ID }, live)).toBe(false);
  });

  it('lets the author and a workspace admin delete, and nobody else', () => {
    expect(canDeleteComment({ role: USER_ROLE.WORKER, userId: ANA_ID }, live)).toBe(true);
    expect(canDeleteComment({ role: USER_ROLE.ADMIN, userId: LUIS_ID }, live)).toBe(true);
    expect(canDeleteComment({ role: USER_ROLE.WORKER, userId: LUIS_ID }, live)).toBe(false);
  });

  it('lets nobody touch a comment that was already deleted', () => {
    const gone = { authorId: ANA_ID, deletedAt: new Date() };

    expect(canEditComment({ role: USER_ROLE.WORKER, userId: ANA_ID }, gone)).toBe(false);
    expect(canDeleteComment({ role: USER_ROLE.ADMIN, userId: ANA_ID }, gone)).toBe(false);
  });
});

describe('parseCommentBody', () => {
  it('accepts text with a mention', () => {
    const result = parseCommentBody([{ insert: 'hola ' }, mention(LUIS_ID, 'Luis')]);

    expect(result.isOk()).toBe(true);
  });

  it('refuses a body that says nothing', () => {
    expect(parseCommentBody([]).getError().code).toBe('COMMENT_BODY_INVALID');
    expect(parseCommentBody([{ insert: '   ' }]).getError().code).toBe('COMMENT_BODY_INVALID');
  });

  it('refuses a body that is not rich text', () => {
    expect(parseCommentBody('hola').getError().code).toBe('COMMENT_BODY_INVALID');
    expect(parseCommentBody([{ insert: 3 }]).getError().code).toBe('COMMENT_BODY_INVALID');
  });

  it('refuses text longer than a comment may be', () => {
    const body = [{ insert: 'a'.repeat(COMMENT_TEXT_MAX_LENGTH + 1) }];

    expect(parseCommentBody(body).getError().code).toBe('COMMENT_BODY_INVALID');
  });

  it('refuses a comment that names too many people', () => {
    const body = Array.from({ length: COMMENT_MENTIONS_MAX + 1 }, (_, index) =>
      mention(`0192f3a0-7c1e-7d2a-9b4e-${String(index).padStart(12, '0')}`, `Persona ${String(index)}`),
    );

    expect(parseCommentBody(body).getError().code).toBe('COMMENT_BODY_INVALID');
  });
});

describe('readDiscussionQuote', () => {
  it('keeps the text that was quoted', () => {
    expect(readDiscussionQuote('  un tramo  ')).toBe('un tramo');
  });

  it('treats a blank or missing quote as a thread about the whole block', () => {
    expect(readDiscussionQuote('   ')).toBeNull();
    expect(readDiscussionQuote(undefined)).toBeNull();
  });
});

describe('planCommentNotifications', () => {
  const everyone = new Set([ANA_ID, LUIS_ID, MARTA_ID]);

  it('notifies a mentioned person who can read the block', () => {
    const plan = planCommentNotifications({
      actorId: ANA_ID,
      mentionedUserIds: [LUIS_ID],
      participantUserIds: [],
      readableUserIds: everyone,
    });

    expect(plan).toEqual([{ kind: 'MENTION', recipientId: LUIS_ID }]);
  });

  it('never notifies the author about their own comment', () => {
    const plan = planCommentNotifications({
      actorId: ANA_ID,
      mentionedUserIds: [ANA_ID],
      participantUserIds: [ANA_ID],
      readableUserIds: everyone,
    });

    expect(plan).toEqual([]);
  });

  it('drops a mentioned person who cannot read the block', () => {
    const plan = planCommentNotifications({
      actorId: ANA_ID,
      mentionedUserIds: [LUIS_ID, MARTA_ID],
      participantUserIds: [],
      readableUserIds: new Set([ANA_ID, LUIS_ID]),
    });

    expect(plan).toEqual([{ kind: 'MENTION', recipientId: LUIS_ID }]);
  });

  it('tells the people already in the thread about a reply', () => {
    const plan = planCommentNotifications({
      actorId: ANA_ID,
      mentionedUserIds: [],
      participantUserIds: [LUIS_ID, MARTA_ID],
      readableUserIds: everyone,
    });

    expect(plan).toEqual([
      { kind: 'REPLY', recipientId: LUIS_ID },
      { kind: 'REPLY', recipientId: MARTA_ID },
    ]);
  });

  it('gives a person who is both mentioned and in the thread only the mention', () => {
    const plan = planCommentNotifications({
      actorId: ANA_ID,
      mentionedUserIds: [LUIS_ID],
      participantUserIds: [LUIS_ID],
      readableUserIds: everyone,
    });

    expect(plan).toEqual([{ kind: 'MENTION', recipientId: LUIS_ID }]);
  });

  it('does not tell a thread participant who lost access to the block', () => {
    const plan = planCommentNotifications({
      actorId: ANA_ID,
      mentionedUserIds: [],
      participantUserIds: [LUIS_ID],
      readableUserIds: new Set([ANA_ID]),
    });

    expect(plan).toEqual([]);
  });
});
