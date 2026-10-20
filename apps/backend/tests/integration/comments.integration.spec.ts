import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import type { BlockRichText, DiscussionPageView, DiscussionView, NotificationPageView } from '@neuma/shared';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { createBlockFactory } from '../factories/block.factory';
import {
  createSeededSpace,
  createSeededUser,
  onlyUserPermissions,
  type SeededUser,
} from '../helpers/block-access.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_BAD_REQUEST = 400;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;

const readErrorCode = (body: unknown): string | undefined => (body as { error?: { code?: string } }).error?.code;

const text = (value: string): BlockRichText => [{ insert: value }];

const mentioning = (userId: string, label: string): BlockRichText => [
  { insert: 'Mira esto ' },
  { insert: { person: { label, userId } } },
];

describe('Threaded comments (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let admin: SeededUser;
  let worker: SeededUser;
  let otherWorker: SeededUser;
  let reader: SeededUser;
  let spaceId: string;
  let pageId: string;
  let blockId: string;

  const blocks = () => createBlockFactory(prisma.models);

  const createPage = async (): Promise<string> =>
    (await blocks().create({ createdById: admin.id, editedById: admin.id, spaceId, title: 'Page', type: 'page' })).id;

  const createParagraph = async (
    parentId: string,
    permissions: ReturnType<typeof onlyUserPermissions> | null = null,
  ): Promise<string> =>
    (
      await blocks().create({
        createdById: admin.id,
        editedById: admin.id,
        parentId,
        permissions,
        spaceId,
        type: 'paragraph',
      })
    ).id;

  const api = (token: string) => ({
    comment: (discussionId: string, body: unknown) =>
      request(testApp.getServer())
        .post(`/api/v1/discussions/${discussionId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ body }),
    delete: (commentId: string) =>
      request(testApp.getServer()).delete(`/api/v1/comments/${commentId}`).set('Authorization', `Bearer ${token}`),
    edit: (commentId: string, body: unknown) =>
      request(testApp.getServer())
        .patch(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ body }),
    list: (page: string, query = '') =>
      request(testApp.getServer())
        .get(`/api/v1/pages/${page}/discussions${query}`)
        .set('Authorization', `Bearer ${token}`),
    notifications: (query = '') =>
      request(testApp.getServer()).get(`/api/v1/notifications${query}`).set('Authorization', `Bearer ${token}`),
    open: (block: string, body: unknown, quote?: string) =>
      request(testApp.getServer())
        .post(`/api/v1/blocks/${block}/discussions`)
        .set('Authorization', `Bearer ${token}`)
        .send(quote === undefined ? { body } : { body, quote }),
    read: (notificationId: string) =>
      request(testApp.getServer())
        .post(`/api/v1/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${token}`),
    readAll: () =>
      request(testApp.getServer()).post('/api/v1/notifications/read-all').set('Authorization', `Bearer ${token}`),
    reopen: (discussionId: string) =>
      request(testApp.getServer())
        .post(`/api/v1/discussions/${discussionId}/reopen`)
        .set('Authorization', `Bearer ${token}`),
    resolve: (discussionId: string) =>
      request(testApp.getServer())
        .post(`/api/v1/discussions/${discussionId}/resolve`)
        .set('Authorization', `Bearer ${token}`),
    unreadCount: () =>
      request(testApp.getServer()).get('/api/v1/notifications/unread-count').set('Authorization', `Bearer ${token}`),
  });

  const openDiscussion = async (token: string, block: string, body: BlockRichText = text('Hola')) =>
    (await api(token).open(block, body).expect(HTTP_CREATED)).body as DiscussionView;

  const readNotifications = async (token: string, query = ''): Promise<NotificationPageView> =>
    (await api(token).notifications(query).expect(HTTP_OK)).body as NotificationPageView;

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    admin = await createSeededUser(testApp, 'comments-admin', 'ADMIN');
    worker = await createSeededUser(testApp, 'comments-worker', 'WORKER');
    otherWorker = await createSeededUser(testApp, 'comments-other-worker', 'WORKER');
    reader = await createSeededUser(testApp, 'comments-reader', 'CLIENT');
    spaceId = await createSeededSpace(testApp, admin.token, SpaceVisibility.PUBLIC_INTERNAL);
    pageId = await createPage();
    blockId = await createParagraph(pageId);
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('opening a discussion', () => {
    it('stores the first message with its author and no anchor when the whole block is commented', async () => {
      const discussion = await openDiscussion(worker.token, blockId, text('Falta el dato'));

      expect(discussion.blockId).toBe(blockId);
      expect(discussion.pageId).toBe(pageId);
      expect(discussion.anchorMarkId).toBeNull();
      expect(discussion.quote).toBeNull();
      expect(discussion.resolvedAt).toBeNull();
      expect(discussion.comments).toHaveLength(1);
      expect(discussion.comments[0]?.authorId).toBe(worker.id);
      expect(discussion.comments[0]?.body).toEqual(text('Falta el dato'));
    });

    it('anchors the discussion to the mark that will carry its own id when a quote is given', async () => {
      const discussion = (await api(worker.token).open(blockId, text('Revisa esto'), 'un tramo').expect(HTTP_CREATED))
        .body as DiscussionView;

      expect(discussion.quote).toBe('un tramo');
      expect(discussion.anchorMarkId).toBe(discussion.id);
    });

    it('refuses a reader who can see the block but cannot edit it', async () => {
      const response = await api(reader.token).open(blockId, text('Hola')).expect(HTTP_FORBIDDEN);

      expect(readErrorCode(response.body)).toBe('COMMENT_NOT_ALLOWED');
    });

    it('refuses an empty comment', async () => {
      const response = await api(worker.token).open(blockId, []).expect(HTTP_BAD_REQUEST);

      expect(readErrorCode(response.body)).toBe('COMMENT_BODY_INVALID');
    });

    it('answers a block that does not exist as a block that cannot be read', async () => {
      await api(worker.token).open(crypto.randomUUID(), text('Hola')).expect(HTTP_NOT_FOUND);
    });
  });

  describe('replying, editing and deleting', () => {
    it('adds a reply to the thread in order', async () => {
      const discussion = await openDiscussion(worker.token, blockId, text('Primera'));

      await api(otherWorker.token).comment(discussion.id, text('Segunda')).expect(HTTP_CREATED);
      const listed = (await api(worker.token).list(pageId).expect(HTTP_OK)).body as DiscussionPageView;
      const thread = listed.discussions.find((candidate) => candidate.id === discussion.id);

      expect(thread?.comments.map((comment) => comment.body)).toEqual([text('Primera'), text('Segunda')]);
    });

    it('lets the author edit and marks the comment as edited', async () => {
      const discussion = await openDiscussion(worker.token, blockId, text('Con error'));
      const commentId = discussion.comments[0]?.id ?? '';

      const response = await api(worker.token).edit(commentId, text('Corregido')).expect(HTTP_OK);

      const edited = response.body as { body: BlockRichText; editedAt: string | null };
      expect(edited.body).toEqual(text('Corregido'));
      expect(edited.editedAt).not.toBeNull();
    });

    it('does not let another person edit a comment, not even an admin', async () => {
      const discussion = await openDiscussion(worker.token, blockId, text('Mío'));
      const commentId = discussion.comments[0]?.id ?? '';

      const response = await api(admin.token).edit(commentId, text('Ajeno')).expect(HTTP_FORBIDDEN);

      expect(readErrorCode(response.body)).toBe('COMMENT_FORBIDDEN');
    });

    it('lets an admin delete any comment but not another worker', async () => {
      const discussion = await openDiscussion(worker.token, blockId, text('Moderable'));
      const replied = (await api(worker.token).comment(discussion.id, text('Respuesta')).expect(HTTP_CREATED))
        .body as DiscussionView;
      const replyId = replied.comments[1]?.id ?? '';

      await api(otherWorker.token).delete(replyId).expect(HTTP_FORBIDDEN);
      await api(admin.token).delete(replyId).expect(HTTP_OK);

      const listed = (await api(worker.token).list(pageId).expect(HTTP_OK)).body as DiscussionPageView;
      const thread = listed.discussions.find((candidate) => candidate.id === discussion.id);
      expect(thread?.comments.map((comment) => comment.isDeleted)).toEqual([false, true]);
      expect(thread?.comments[1]?.body).toEqual([]);
    });

    it('removes the discussion once every one of its comments was deleted', async () => {
      const discussion = await openDiscussion(worker.token, blockId, text('Efímera'));

      await api(worker.token)
        .delete(discussion.comments[0]?.id ?? '')
        .expect(HTTP_OK);

      const listed = (await api(worker.token).list(pageId).expect(HTTP_OK)).body as DiscussionPageView;
      expect(listed.discussions.some((candidate) => candidate.id === discussion.id)).toBe(false);
    });
  });

  describe('what each reader may do', () => {
    it('tells a reader they cannot reply, edit or delete, and lets the author and an admin act as they may', async () => {
      const rightsPageId = await createPage();
      const rightsBlockId = await createParagraph(rightsPageId);
      const discussion = await openDiscussion(worker.token, rightsBlockId, text('Mío'));

      const seenByReader = (await api(reader.token).list(rightsPageId).expect(HTTP_OK)).body as DiscussionPageView;
      const seenByAuthor = (await api(worker.token).list(rightsPageId).expect(HTTP_OK)).body as DiscussionPageView;
      const seenByAdmin = (await api(admin.token).list(rightsPageId).expect(HTTP_OK)).body as DiscussionPageView;
      const ofReader = seenByReader.discussions.find((candidate) => candidate.id === discussion.id);
      const ofAuthor = seenByAuthor.discussions.find((candidate) => candidate.id === discussion.id);
      const ofAdmin = seenByAdmin.discussions.find((candidate) => candidate.id === discussion.id);

      expect(ofReader?.canComment).toBe(false);
      expect(ofReader?.comments[0]).toMatchObject({ canDelete: false, canEdit: false });
      expect(ofAuthor?.canComment).toBe(true);
      expect(ofAuthor?.comments[0]).toMatchObject({ canDelete: true, canEdit: true });
      expect(ofAdmin?.comments[0]).toMatchObject({ canDelete: true, canEdit: false });
    });
  });

  describe('resolving', () => {
    it('resolves and reopens a discussion, and lists resolved ones only when asked', async () => {
      const resolvedPageId = await createPage();
      const resolvedBlockId = await createParagraph(resolvedPageId);
      const discussion = await openDiscussion(worker.token, resolvedBlockId);

      const resolved = (await api(otherWorker.token).resolve(discussion.id).expect(HTTP_CREATED))
        .body as DiscussionView;
      const hidden = (await api(worker.token).list(resolvedPageId).expect(HTTP_OK)).body as DiscussionPageView;
      const shown = (await api(worker.token).list(resolvedPageId, '?includeResolved=true').expect(HTTP_OK))
        .body as DiscussionPageView;
      const reopened = (await api(worker.token).reopen(discussion.id).expect(HTTP_CREATED)).body as DiscussionView;

      expect(resolved.resolvedAt).not.toBeNull();
      expect(resolved.resolvedById).toBe(otherWorker.id);
      expect(hidden.discussions).toHaveLength(0);
      expect(shown.discussions).toHaveLength(1);
      expect(reopened.resolvedAt).toBeNull();
    });

    it('refuses a reader to resolve', async () => {
      const discussion = await openDiscussion(worker.token, blockId);

      await api(reader.token).resolve(discussion.id).expect(HTTP_FORBIDDEN);
    });
  });

  describe('listing a page', () => {
    it('pages through the discussions with a cursor and no repeats', async () => {
      const crowdedPageId = await createPage();
      const crowdedBlockId = await createParagraph(crowdedPageId);
      for (const label of ['uno', 'dos', 'tres']) await openDiscussion(worker.token, crowdedBlockId, text(label));

      const first = (await api(worker.token).list(crowdedPageId, '?limit=2').expect(HTTP_OK))
        .body as DiscussionPageView;
      const second = (
        await api(worker.token)
          .list(crowdedPageId, `?limit=2&cursor=${encodeURIComponent(first.nextCursor ?? '')}`)
          .expect(HTTP_OK)
      ).body as DiscussionPageView;

      expect(first.discussions).toHaveLength(2);
      expect(first.nextCursor).not.toBeNull();
      expect(second.discussions).toHaveLength(1);
      expect(second.nextCursor).toBeNull();
      const ids = [...first.discussions, ...second.discussions].map((discussion) => discussion.id);
      expect(new Set(ids).size).toBe(3);
    });

    it('leaves out the discussions of a block the reader cannot read', async () => {
      const privatePageId = await createPage();
      const openBlockId = await createParagraph(privatePageId);
      const hiddenBlockId = await createParagraph(privatePageId, onlyUserPermissions(admin.id));
      const visible = await openDiscussion(admin.token, openBlockId, text('Visible'));
      await openDiscussion(admin.token, hiddenBlockId, text('Secreto'));

      const asWorker = (await api(worker.token).list(privatePageId).expect(HTTP_OK)).body as DiscussionPageView;
      const asAdmin = (await api(admin.token).list(privatePageId).expect(HTTP_OK)).body as DiscussionPageView;

      expect(asWorker.discussions.map((discussion) => discussion.id)).toEqual([visible.id]);
      expect(asAdmin.discussions).toHaveLength(2);
      expect(JSON.stringify(asWorker)).not.toContain('Secreto');
    });

    it('does not open, reply to or resolve a discussion of a block the person cannot read', async () => {
      const hiddenBlockId = await createParagraph(pageId, onlyUserPermissions(admin.id));
      const discussion = await openDiscussion(admin.token, hiddenBlockId, text('Secreto'));

      await api(worker.token).open(hiddenBlockId, text('Intruso')).expect(HTTP_NOT_FOUND);
      await api(worker.token).comment(discussion.id, text('Intruso')).expect(HTTP_NOT_FOUND);
      await api(worker.token).resolve(discussion.id).expect(HTTP_NOT_FOUND);
    });
  });

  describe('notifications', () => {
    it('tells a mentioned person, who then reads it and finds the unread count drop', async () => {
      const mentionPageId = await createPage();
      const mentionBlockId = await createParagraph(mentionPageId);
      const before = await readNotifications(otherWorker.token, '?unreadOnly=true');

      const discussion = await openDiscussion(worker.token, mentionBlockId, mentioning(otherWorker.id, 'Otra'));
      const after = await readNotifications(otherWorker.token, '?unreadOnly=true');
      const mention = after.notifications.find((notification) => notification.discussionId === discussion.id);

      expect(after.unreadCount).toBe(before.unreadCount + 1);
      expect(mention?.kind).toBe('MENTION');
      expect(mention?.actorId).toBe(worker.id);
      expect(mention?.pageId).toBe(mentionPageId);
      expect(mention?.excerpt).toBe('Mira esto Otra');
      expect(mention?.readAt).toBeNull();
      await api(otherWorker.token)
        .read(mention?.id ?? '')
        .expect(HTTP_CREATED);
      expect((await readNotifications(otherWorker.token, '?unreadOnly=true')).unreadCount).toBe(before.unreadCount);
    });

    it('does not tell the author about their own mention', async () => {
      const selfPageId = await createPage();
      const selfBlockId = await createParagraph(selfPageId);
      const before = await readNotifications(worker.token);

      await openDiscussion(worker.token, selfBlockId, mentioning(worker.id, 'Yo'));

      expect((await readNotifications(worker.token)).unreadCount).toBe(before.unreadCount);
    });

    it('does not tell a mentioned person who cannot read the block, and does not reveal the block', async () => {
      const hiddenBlockId = await createParagraph(pageId, onlyUserPermissions(admin.id));
      const before = await readNotifications(otherWorker.token);

      await openDiscussion(admin.token, hiddenBlockId, mentioning(otherWorker.id, 'Otra'));

      const after = await readNotifications(otherWorker.token);
      expect(after.unreadCount).toBe(before.unreadCount);
      expect(after.notifications.some((notification) => notification.blockId === hiddenBlockId)).toBe(false);
    });

    it('tells the people in a thread about a reply', async () => {
      const replyPageId = await createPage();
      const replyBlockId = await createParagraph(replyPageId);
      const discussion = await openDiscussion(worker.token, replyBlockId, text('Pregunta'));

      await api(otherWorker.token).comment(discussion.id, text('Respuesta')).expect(HTTP_CREATED);

      const inbox = await readNotifications(worker.token);
      const reply = inbox.notifications.find((notification) => notification.discussionId === discussion.id);
      expect(reply?.kind).toBe('REPLY');
      expect(reply?.actorId).toBe(otherWorker.id);
    });

    it('stops returning a notification once the person lost access to its block', async () => {
      const revokedPageId = await createPage();
      const revokedBlockId = await createParagraph(revokedPageId);
      const discussion = await openDiscussion(admin.token, revokedBlockId, mentioning(otherWorker.id, 'Otra'));
      const before = await readNotifications(otherWorker.token);
      expect(before.notifications.some((notification) => notification.discussionId === discussion.id)).toBe(true);

      await prisma.models.Block.where({ id: revokedBlockId }).update({ permissions: onlyUserPermissions(admin.id) });

      const after = await readNotifications(otherWorker.token);
      expect(after.notifications.some((notification) => notification.discussionId === discussion.id)).toBe(false);
      expect(after.unreadCount).toBe(before.unreadCount - 1);
    });

    it('marks everything as read at once', async () => {
      const bulkPageId = await createPage();
      const bulkBlockId = await createParagraph(bulkPageId);
      await openDiscussion(admin.token, bulkBlockId, mentioning(reader.id, 'Lector'));

      await api(reader.token).readAll().expect(HTTP_CREATED);

      expect((await readNotifications(reader.token)).unreadCount).toBe(0);
    });

    it('pages the inbox with a cursor', async () => {
      const inboxPageId = await createPage();
      const inboxBlockId = await createParagraph(inboxPageId);
      for (let index = 0; index < 3; index += 1) {
        await openDiscussion(admin.token, inboxBlockId, mentioning(otherWorker.id, 'Otra'));
      }

      const first = await readNotifications(otherWorker.token, '?limit=2');
      const second = await readNotifications(
        otherWorker.token,
        `?limit=2&cursor=${encodeURIComponent(first.nextCursor ?? '')}`,
      );

      expect(first.notifications).toHaveLength(2);
      expect(first.nextCursor).not.toBeNull();
      const ids = [...first.notifications, ...second.notifications].map((notification) => notification.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('does not let one person read the notification of another', async () => {
      const privatePageId = await createPage();
      const privateBlockId = await createParagraph(privatePageId);
      await openDiscussion(admin.token, privateBlockId, mentioning(otherWorker.id, 'Otra'));
      const inbox = await readNotifications(otherWorker.token);

      await api(worker.token)
        .read(inbox.notifications[0]?.id ?? '')
        .expect(HTTP_NOT_FOUND);
    });
  });
});
