import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { ConfigService } from '@nestjs/config';
import { SpaceVisibility } from '@neuma/db';
import { BLOCK_ROLE } from '@neuma/shared';
import { Client } from 'pg';
import request from 'supertest';
import { applyUpdate, Doc, encodeStateAsUpdate, encodeStateVector, type Text } from 'yjs';
import { BLOCK_WRITE_RATE_LIMIT } from '@/common/constants/throttler.constants';
import { PrismaService } from '@/prisma/prisma.service';
import { createBlockFactory } from '../factories/block.factory';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface IdResponse {
  id: string;
}

interface Outcome {
  blocks?: { id: string; version: number }[];
  error?: { code: string; message: string };
  id: string;
}

interface TransactionsResponse {
  transactions: Outcome[];
}

interface SyncedBlock {
  children: string[];
  id: string;
  role: string;
}

interface SyncResponse {
  blocks: SyncedBlock[];
}

interface Notification {
  blocks?: { id: string; version: number }[] | undefined;
  spaceId: string;
  transactionId: string;
  truncated?: boolean;
}

interface Operation {
  args: unknown;
  command: string;
  path: string[];
  pointer: { id: string; table: 'block' };
}

const PASSWORD = 'plainPassword123';
const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_TOO_MANY_REQUESTS = 429;
const BLOCK_WRITE_BURST_LIMIT = BLOCK_WRITE_RATE_LIMIT.burstLimit;
const NOTIFICATION_WAIT_MS = 1500;
const NOTIFICATION_POLL_MS = 25;

const required = <Row>(row: Row | null | undefined, description: string): Row => {
  if (row === null || row === undefined) throw new Error(`Expected ${description} to exist`);
  return row;
};

const op = (command: string, id: string, path: string[], args: unknown): Operation => ({
  args,
  command,
  path,
  pointer: { id, table: 'block' },
});

const createParagraphOps = (blockId: string, parentId: string, anchorId?: string): Operation[] => [
  op('set', blockId, [], { id: blockId, parentId, properties: { title: [{ insert: 'Hello' }] }, type: 'paragraph' }),
  op('listAfter', parentId, ['children'], anchorId === undefined ? { id: blockId } : { after: anchorId, id: blockId }),
];

const moveOps = (blockId: string, fromId: string, toId: string): Operation[] => [
  op('update', blockId, [], { parentId: toId }),
  op('listRemove', fromId, ['children'], { id: blockId }),
  op('listAfter', toId, ['children'], { id: blockId }),
];

const toBase64 = (bytes: Uint8Array): string => Buffer.from(bytes).toString('base64');

/** An update a client sends after editing its copy of the text, which started from `base`. */
const buildTextUpdate = (base: Uint8Array | null, edit: (text: Text) => void): string => {
  const doc = new Doc();
  if (base !== null) applyUpdate(doc, base);
  const before = encodeStateVector(doc);
  edit(doc.getText('title'));
  return toBase64(encodeStateAsUpdate(doc, before));
};

const readText = (title: unknown): string => {
  if (!Array.isArray(title)) return '';
  return title
    .map((segment: { insert: unknown }) => (typeof segment.insert === 'string' ? segment.insert : '*'))
    .join('');
};

describe('POST /transactions: block writes (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let adminToken: string;
  let workerToken: string;
  let clientToken: string;
  let adminId: string;
  let workerId: string;
  let spaceId: string;
  let otherSpaceId: string;
  const pageId = crypto.randomUUID();
  const anchorId = crypto.randomUUID();
  const secondPageId = crypto.randomUUID();
  const hiddenPageId = crypto.randomUUID();
  const hiddenChildId = crypto.randomUUID();
  const lockedPageId = crypto.randomUUID();
  const lockedChildId = crypto.randomUUID();
  const trashedPageId = crypto.randomUUID();
  const trashedChildId = crypto.randomUUID();
  const targetPageId = crypto.randomUUID();

  const send = async (token: string, transactions: unknown[], expectedStatus = HTTP_OK) =>
    request(testApp.getServer())
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ transactions })
      .expect(expectedStatus);

  const transaction = (operations: Operation[], id = crypto.randomUUID(), inSpaceId = spaceId) => ({
    id,
    operations,
    spaceId: inSpaceId,
  });

  const sendOne = async (token: string, operations: Operation[], id = crypto.randomUUID()): Promise<Outcome> => {
    const response = await send(token, [transaction(operations, id)]);
    return required((response.body as TransactionsResponse).transactions[0], 'an outcome');
  };

  const sync = async (token: string, body: object): Promise<SyncResponse> => {
    const response = await request(testApp.getServer())
      .post('/api/v1/sync')
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(HTTP_OK);
    return response.body as SyncResponse;
  };

  const findBlock = (id: string) => prisma.models.Block.where({ id }).first();

  const createSpace = async (name: string, visibility: SpaceVisibility): Promise<string> => {
    const response = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name, slug: `${name}-${String(Date.now())}`, visibility })
      .expect(201);
    return (response.body as IdResponse).id;
  };

  const createUser = async (label: string, role: 'ADMIN' | 'CLIENT' | 'WORKER') => {
    const email = `blocks-tx-${label}-${String(Date.now())}@test.com`;
    await createAccount(testApp, { email, name: `Tx ${label}`, password: PASSWORD });
    if (role !== 'CLIENT') await prisma.models.User.where({ email }).update({ role });
    const token = (await loginUser(testApp, email, PASSWORD)).accessToken;
    const user = required(await prisma.models.User.where({ email }).first(), `the ${label}`);
    return { id: user.id, token };
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    const admin = await createUser('admin', 'ADMIN');
    const worker = await createUser('worker', 'WORKER');
    const client = await createUser('client', 'CLIENT');
    adminToken = admin.token;
    adminId = admin.id;
    workerToken = worker.token;
    workerId = worker.id;
    clientToken = client.token;
    spaceId = await createSpace('tx-open', SpaceVisibility.PUBLIC_INTERNAL);
    otherSpaceId = await createSpace('tx-other', SpaceVisibility.PUBLIC_INTERNAL);

    const blocks = createBlockFactory(prisma.models);
    const author = { createdById: adminId, editedById: adminId, spaceId };
    await blocks.create({ ...author, children: [anchorId], id: pageId, type: 'page', version: 3 });
    await blocks.create({ ...author, id: anchorId, parentId: pageId });
    await blocks.create({ ...author, id: secondPageId, type: 'page' });
    await blocks.create({ ...author, id: targetPageId, type: 'page' });
    await blocks.create({
      ...author,
      children: [hiddenChildId],
      id: hiddenPageId,
      permissions: [{ principal: { kind: 'user', userId: adminId }, role: BLOCK_ROLE.full }],
      type: 'page',
    });
    await blocks.create({ ...author, id: hiddenChildId, parentId: hiddenPageId });
    await blocks.create({ ...author, children: [lockedChildId], id: lockedPageId, lockedAt: new Date(), type: 'page' });
    await blocks.create({ ...author, id: lockedChildId, parentId: lockedPageId });
    await blocks.create({
      ...author,
      children: [trashedChildId],
      id: trashedPageId,
      lifecycle: 'TRASHED',
      type: 'page',
    });
    await blocks.create({ ...author, id: trashedChildId, parentId: trashedPageId });
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('creating and reading back', () => {
    it('creates a paragraph under a page in one transaction and sync returns it with the new child list', async () => {
      const paragraphId = crypto.randomUUID();

      const outcome = await sendOne(workerToken, createParagraphOps(paragraphId, pageId, anchorId));

      expect(outcome.error).toBeUndefined();
      expect(outcome.blocks).toEqual([
        { id: paragraphId, version: 1 },
        { id: pageId, version: 4 },
      ]);
      const synced = await sync(workerToken, { pageId });
      expect(synced.blocks.find((block) => block.id === pageId)?.children).toEqual([anchorId, paragraphId]);
      expect(synced.blocks.find((block) => block.id === paragraphId)?.role).toBe(BLOCK_ROLE.editor);
      const stored = required(await findBlock(paragraphId), 'the paragraph');
      expect(stored).toMatchObject({ createdById: workerId, editedById: workerId, parentId: pageId, text: 'Hello' });
    });

    it('moves a block between two parents', async () => {
      const movedId = crypto.randomUUID();
      await sendOne(workerToken, createParagraphOps(movedId, pageId));

      const outcome = await sendOne(workerToken, moveOps(movedId, pageId, secondPageId));

      expect(outcome.error).toBeUndefined();
      const moved = required(await findBlock(movedId), 'the moved block');
      expect(moved.parentId).toBe(secondPageId);
      expect(moved.version).toBe(2);
      expect((await findBlock(pageId))?.children).not.toContain(movedId);
      expect((await findBlock(secondPageId))?.children).toContain(movedId);
    });

    it('refuses a move that would hang a page under its own descendant', async () => {
      const outerId = crypto.randomUUID();
      const innerId = crypto.randomUUID();
      const toggle = (id: string, parentId: string) =>
        op('set', id, [], { id, parentId, properties: { title: [] }, type: 'toggle' });
      await sendOne(workerToken, [
        toggle(outerId, pageId),
        op('listAfter', pageId, ['children'], { id: outerId }),
        toggle(innerId, outerId),
        op('listAfter', outerId, ['children'], { id: innerId }),
      ]);

      const outcome = await sendOne(workerToken, moveOps(outerId, pageId, innerId));

      expect(outcome.error?.code).toBe('BLOCK_CYCLE');
      expect((await findBlock(outerId))?.parentId).toBe(pageId);
    });
  });

  describe('all or nothing', () => {
    it('rolls the whole transaction back when a pointer in the middle is forbidden', async () => {
      const paragraphId = crypto.randomUUID();
      const before = required(await findBlock(pageId), 'the page');

      const outcome = await sendOne(workerToken, [
        ...createParagraphOps(paragraphId, pageId),
        op('update', hiddenChildId, ['format'], { textColor: 'red' }),
      ]);

      expect(outcome.error?.code).toBe('BLOCK_ACCESS_DENIED');
      expect(await findBlock(paragraphId)).toBeNull();
      const after = required(await findBlock(pageId), 'the page');
      expect(after.children).toEqual(before.children);
      expect(after.version).toBe(before.version);
    });

    it('applies each transaction of a request on its own', async () => {
      const appliedId = crypto.randomUUID();

      const response = await send(workerToken, [
        transaction([op('update', hiddenChildId, [], { alive: false })]),
        transaction(createParagraphOps(appliedId, secondPageId)),
      ]);

      const outcomes = (response.body as TransactionsResponse).transactions;
      expect(outcomes[0]?.error?.code).toBe('BLOCK_ACCESS_DENIED');
      expect(outcomes[1]?.error).toBeUndefined();
      expect(await findBlock(appliedId)).not.toBeNull();
      expect((await findBlock(hiddenChildId))?.alive).toBe(true);
    });

    it('rolls back a transaction whose final tree is broken', async () => {
      const paragraphId = crypto.randomUUID();

      const outcome = await sendOne(workerToken, [createParagraphOps(paragraphId, pageId)[0] as Operation]);

      expect(outcome.error?.code).toBe('BLOCK_TREE_INVALID');
      expect(await findBlock(paragraphId)).toBeNull();
    });
  });

  describe('retries', () => {
    it('applies a transaction once and answers a retry with the stored result', async () => {
      const paragraphId = crypto.randomUUID();
      const transactionId = crypto.randomUUID();
      const operations = createParagraphOps(paragraphId, secondPageId);

      const first = await sendOne(workerToken, operations, transactionId);
      const second = await sendOne(workerToken, operations, transactionId);

      expect(second).toEqual(first);
      expect((await findBlock(paragraphId))?.version).toBe(1);
      expect(await prisma.models.BlockTransaction.where({ id: transactionId }).all()).toHaveLength(1);
    });

    it('applies once when the same transaction arrives twice at the same time', async () => {
      const paragraphId = crypto.randomUUID();
      const transactionId = crypto.randomUUID();
      const operations = createParagraphOps(paragraphId, secondPageId);

      const [first, second] = await Promise.all([
        sendOne(workerToken, operations, transactionId),
        sendOne(workerToken, operations, transactionId),
      ]);

      expect(first.error).toBeUndefined();
      expect(second).toEqual(first);
      expect((await findBlock(paragraphId))?.version).toBe(1);
    });

    it('refuses an id that belongs to another user', async () => {
      const transactionId = crypto.randomUUID();
      await sendOne(workerToken, createParagraphOps(crypto.randomUUID(), secondPageId), transactionId);

      const outcome = await sendOne(adminToken, createParagraphOps(crypto.randomUUID(), secondPageId), transactionId);

      expect(outcome.error?.code).toBe('BLOCK_TRANSACTION_ID_TAKEN');
    });
  });

  describe('text', () => {
    let textBlockId: string;
    let textPageId: string;

    beforeAll(async () => {
      textPageId = crypto.randomUUID();
      textBlockId = crypto.randomUUID();
      const blocks = createBlockFactory(prisma.models);
      const author = { createdById: adminId, editedById: adminId, spaceId };
      await blocks.create({ ...author, children: [textBlockId], id: textPageId, type: 'page' });
      await blocks.create({ ...author, id: textBlockId, parentId: textPageId, properties: { title: [] } });
    });

    const readState = async (id: string): Promise<Uint8Array> => {
      const stored = required(await findBlock(id), `block ${id}`);
      return new Uint8Array(required(stored.textState, 'the text state'));
    };

    it('stores the merged text and its state when an update is applied', async () => {
      const update = buildTextUpdate(null, (text) => {
        text.insert(0, 'abc');
      });

      const outcome = await sendOne(workerToken, [op('applyText', textBlockId, [], { property: 'title', update })]);

      expect(outcome.error).toBeUndefined();
      const stored = required(await findBlock(textBlockId), 'the block');
      expect(readText((stored.properties as { title: unknown }).title)).toBe('abc');
      expect(stored.text).toBe('abc');
    });

    it('lands two concurrent updates and keeps both edits', async () => {
      const base = await readState(textBlockId);
      const fromLeft = buildTextUpdate(base, (text) => {
        text.insert(0, 'L-');
      });
      const fromRight = buildTextUpdate(base, (text) => {
        text.insert(text.length, '-R');
      });
      const versionBefore = required(await findBlock(textBlockId), 'the block').version;

      const [left, right] = await Promise.all([
        sendOne(workerToken, [op('applyText', textBlockId, [], { property: 'title', update: fromLeft })]),
        sendOne(adminToken, [op('applyText', textBlockId, [], { property: 'title', update: fromRight })]),
      ]);

      expect(left.error).toBeUndefined();
      expect(right.error).toBeUndefined();
      const stored = required(await findBlock(textBlockId), 'the block');
      expect(readText((stored.properties as { title: unknown }).title)).toBe('L-abc-R');
      expect(stored.text).toBe('L-abc-R');
      expect(stored.version).toBe(versionBefore + 2);
    });

    it('turns a mention into a link and removes the link when the mention goes', async () => {
      const mention = { insert: { mention: { label: 'Target', pageId: targetPageId, spaceId } } };
      const stateBefore = await readState(textBlockId);
      const withMention = buildTextUpdate(stateBefore, (text) => {
        text.insertEmbed(text.length, mention.insert);
      });

      await sendOne(workerToken, [op('applyText', textBlockId, [], { property: 'title', update: withMention })]);

      const links = await prisma.models.BlockLink.where({ sourceBlockId: textBlockId }).all();
      expect(links.map((link) => [link.kind, link.targetBlockId, link.sourcePageId])).toEqual([
        ['mention', targetPageId, textPageId],
      ]);

      const stateWith = await readState(textBlockId);
      const withoutMention = buildTextUpdate(stateWith, (text) => {
        text.delete(text.length - 1, 1);
      });
      await sendOne(workerToken, [op('applyText', textBlockId, [], { property: 'title', update: withoutMention })]);

      expect(await prisma.models.BlockLink.where({ sourceBlockId: textBlockId }).all()).toHaveLength(0);
    });

    const stateText = async (id: string): Promise<string> => {
      const doc = new Doc();
      applyUpdate(doc, await readState(id));
      return readText(doc.getText('title').toDelta());
    };

    const storedText = async (id: string): Promise<string> =>
      readText((required(await findBlock(id), `block ${id}`).properties as { title: unknown }).title);

    it('keeps a direct write of the text in step with the Yjs state', async () => {
      const outcome = await sendOne(workerToken, [
        op('set', textBlockId, ['properties', 'title'], [{ insert: 'Overwritten' }]),
      ]);

      expect(outcome.error).toBeUndefined();
      expect(await storedText(textBlockId)).toBe('Overwritten');
      expect(await stateText(textBlockId)).toBe('Overwritten');
    });

    it('gives a block created with text a Yjs state, and merges a client that started from it', async () => {
      const blockId = crypto.randomUUID();
      await sendOne(workerToken, createParagraphOps(blockId, textPageId));
      const state = await readState(blockId);
      const fromClient = buildTextUpdate(state, (text) => {
        text.insert(text.length, '!');
      });

      const outcome = await sendOne(workerToken, [
        op('applyText', blockId, [], { property: 'title', update: fromClient }),
      ]);

      expect(outcome.error).toBeUndefined();
      expect(await storedText(blockId)).toBe('Hello!');
      expect(await stateText(blockId)).toBe('Hello!');
    });

    it('keeps both coherent when a direct update follows an applyText', async () => {
      const blockId = crypto.randomUUID();
      await sendOne(workerToken, createParagraphOps(blockId, textPageId));
      const typed = buildTextUpdate(await readState(blockId), (text) => {
        text.insert(0, '>');
      });
      await sendOne(workerToken, [op('applyText', blockId, [], { property: 'title', update: typed })]);

      await sendOne(workerToken, [op('update', blockId, ['properties'], { title: [{ insert: 'Replaced' }] })]);

      expect(await storedText(blockId)).toBe('Replaced');
      expect(await stateText(blockId)).toBe('Replaced');
    });

    it('lands a direct update and an applyText sent at the same time, whatever their order', async () => {
      const blockId = crypto.randomUUID();
      await sendOne(workerToken, createParagraphOps(blockId, textPageId));
      const typed = buildTextUpdate(await readState(blockId), (text) => {
        text.insert(text.length, ' world');
      });

      const [direct, merged] = await Promise.all([
        sendOne(workerToken, [
          op('update', blockId, ['format'], { textColor: 'red' }),
          op('update', blockId, ['properties'], { title: [{ insert: 'Direct' }] }),
        ]),
        sendOne(adminToken, [op('applyText', blockId, [], { property: 'title', update: typed })]),
      ]);

      expect(direct.error).toBeUndefined();
      expect(merged.error).toBeUndefined();
      expect(await storedText(blockId)).toBe(await stateText(blockId));
      expect(await storedText(blockId)).toContain('Direct');
      expect((await findBlock(blockId))?.format).toEqual({ textColor: 'red' });
    });

    const createLegacyBlock = async (): Promise<string> => {
      const legacyId = crypto.randomUUID();
      await createBlockFactory(prisma.models).create({
        createdById: adminId,
        editedById: adminId,
        id: legacyId,
        parentId: textPageId,
        spaceId,
        title: 'Legacy',
      });
      return legacyId;
    };

    it('rejects an update built on another history for a block with no state, and keeps its text', async () => {
      const legacyId = await createLegacyBlock();
      const unsynced = new Doc();
      unsynced.getText('title').insert(0, 'Legacy');
      const before = encodeStateVector(unsynced);
      unsynced.getText('title').insert(6, '!');
      const update = toBase64(encodeStateAsUpdate(unsynced, before));

      const outcome = await sendOne(workerToken, [op('applyText', legacyId, [], { property: 'title', update })]);

      expect(outcome.error?.code).toBe('BLOCK_TEXT_OUT_OF_SYNC');
      expect(await storedText(legacyId)).toBe('Legacy');
      expect((await findBlock(legacyId))?.textState).toBeNull();
    });

    it('builds the state from the stored text on the first applyText, and a client that syncs afterwards converges', async () => {
      const legacyId = await createLegacyBlock();
      const standalone = buildTextUpdate(null, (text) => {
        text.insert(0, '!');
      });

      const first = await sendOne(workerToken, [
        op('applyText', legacyId, [], { property: 'title', update: standalone }),
      ]);

      expect(first.error).toBeUndefined();
      expect(await storedText(legacyId)).toContain('Legacy');
      const synced = buildTextUpdate(await readState(legacyId), (text) => {
        text.insert(text.length, '?');
      });
      const second = await sendOne(workerToken, [op('applyText', legacyId, [], { property: 'title', update: synced })]);
      expect(second.error).toBeUndefined();
      expect(await storedText(legacyId)).toContain('?');
      expect(await storedText(legacyId)).toBe(await stateText(legacyId));
    });

    it('keeps an edit made elsewhere in the text when a direct write changes only one span', async () => {
      const blockId = crypto.randomUUID();
      await sendOne(workerToken, [
        op('set', blockId, [], {
          id: blockId,
          parentId: textPageId,
          properties: { title: [{ insert: 'abc def' }] },
          type: 'paragraph',
        }),
        op('listAfter', textPageId, ['children'], { id: blockId }),
      ]);
      const clientDeletesTail = buildTextUpdate(await readState(blockId), (text) => {
        text.delete(3, 4);
      });

      await sendOne(workerToken, [op('update', blockId, ['properties'], { title: [{ insert: 'xyz def' }] })]);
      const outcome = await sendOne(adminToken, [
        op('applyText', blockId, [], { property: 'title', update: clientDeletesTail }),
      ]);

      expect(outcome.error).toBeUndefined();
      expect(await storedText(blockId)).toBe('xyz');
      expect(await stateText(blockId)).toBe('xyz');
    });

    it('removes a key from properties or format when an update gives it as null', async () => {
      const blockId = crypto.randomUUID();
      await sendOne(workerToken, createParagraphOps(blockId, textPageId));
      await sendOne(workerToken, [op('update', blockId, ['format'], { backgroundColor: 'blue', textColor: 'red' })]);

      const outcome = await sendOne(workerToken, [op('update', blockId, ['format'], { textColor: null })]);

      expect(outcome.error).toBeUndefined();
      expect((await findBlock(blockId))?.format).toEqual({ backgroundColor: 'blue' });
    });

    it('refuses an update that is not Yjs', async () => {
      const outcome = await sendOne(workerToken, [
        op('applyText', textBlockId, [], { property: 'title', update: toBase64(new Uint8Array([9, 9, 9, 9])) }),
      ]);

      expect(outcome.error?.code).toBe('BLOCK_TEXT_UPDATE_INVALID');
    });
  });

  describe('links', () => {
    it('keeps the links of a block in step with its subpage reference and moves them with a block under another page', async () => {
      const subpageId = crypto.randomUUID();
      await sendOne(workerToken, [
        op('set', subpageId, [], {
          id: subpageId,
          parentId: pageId,
          properties: { label: 'Target', pageId: targetPageId, spaceId },
          type: 'subpage',
        }),
        op('listAfter', pageId, ['children'], { id: subpageId }),
      ]);
      expect(
        (await prisma.models.BlockLink.where({ sourceBlockId: subpageId }).all()).map((link) => link.sourcePageId),
      ).toEqual([pageId]);

      await sendOne(workerToken, moveOps(subpageId, pageId, secondPageId));

      const moved = await prisma.models.BlockLink.where({ sourceBlockId: subpageId }).all();
      expect(moved.map((link) => [link.kind, link.targetBlockId, link.sourcePageId])).toEqual([
        ['subpage', targetPageId, secondPageId],
      ]);
    });

    it('moves the links of the blocks below a moved block to the new page', async () => {
      const toggleId = crypto.randomUUID();
      const nestedId = crypto.randomUUID();
      await sendOne(workerToken, [
        op('set', toggleId, [], { id: toggleId, parentId: pageId, properties: { title: [] }, type: 'toggle' }),
        op('listAfter', pageId, ['children'], { id: toggleId }),
        op('set', nestedId, [], {
          id: nestedId,
          parentId: toggleId,
          properties: { label: 'T', pageId: targetPageId, spaceId },
          type: 'subpage',
        }),
        op('listAfter', toggleId, ['children'], { id: nestedId }),
      ]);

      await sendOne(workerToken, moveOps(toggleId, pageId, secondPageId));

      const links = await prisma.models.BlockLink.where({ sourceBlockId: nestedId }).all();
      expect(links.map((link) => link.sourcePageId)).toEqual([secondPageId]);
    });

    it('deletes the links of a block that is removed', async () => {
      const subpageId = crypto.randomUUID();
      await sendOne(workerToken, [
        op('set', subpageId, [], {
          id: subpageId,
          parentId: secondPageId,
          properties: { label: 'Gone', pageId: targetPageId, spaceId },
          type: 'subpage',
        }),
        op('listAfter', secondPageId, ['children'], { id: subpageId }),
      ]);

      await sendOne(workerToken, [
        op('update', subpageId, [], { alive: false }),
        op('listRemove', secondPageId, ['children'], { id: subpageId }),
      ]);

      expect(await prisma.models.BlockLink.where({ sourceBlockId: subpageId }).all()).toHaveLength(0);
    });
  });

  describe('who may write', () => {
    it('does not let a client write, even where it can read', async () => {
      const outcome = await sendOne(clientToken, createParagraphOps(crypto.randomUUID(), pageId));

      expect(outcome.error?.code).toBe('BLOCK_EDIT_FORBIDDEN');
    });

    it('does not let a viewer write a block that block permissions hide from them', async () => {
      const outcome = await sendOne(workerToken, [op('update', hiddenChildId, ['format'], { textColor: 'red' })]);

      expect(outcome.error?.code).toBe('BLOCK_ACCESS_DENIED');
      expect((await findBlock(hiddenChildId))?.version).toBe(1);
    });

    it('lets the one with full access write there', async () => {
      const outcome = await sendOne(adminToken, [op('set', hiddenChildId, ['format', 'textColor'], 'red')]);

      expect(outcome.error).toBeUndefined();
      expect((await findBlock(hiddenChildId))?.format).toEqual({ textColor: 'red' });
    });

    it('does not write in a space the user cannot reach, or a block of another space', async () => {
      const response = await send(workerToken, [
        transaction(createParagraphOps(crypto.randomUUID(), pageId), crypto.randomUUID(), otherSpaceId),
        transaction([op('update', pageId, ['format'], { open: true })], crypto.randomUUID(), crypto.randomUUID()),
      ]);

      const outcomes = (response.body as TransactionsResponse).transactions;
      expect(outcomes[0]?.error?.code).toBe('BLOCK_ACCESS_DENIED');
      expect(outcomes[1]?.error?.code).toBe('BLOCK_ACCESS_DENIED');
    });

    it('lets only full access change permissions', async () => {
      const permissions = [
        { principal: { kind: 'user', userId: adminId }, role: BLOCK_ROLE.full },
        { principal: { kind: 'space' }, role: BLOCK_ROLE.reader },
      ];

      const refused = await sendOne(workerToken, [op('setPermission', anchorId, [], { permissions })]);
      const accepted = await sendOne(adminToken, [op('setPermission', anchorId, [], { permissions })]);

      expect(refused.error?.code).toBe('BLOCK_PERMISSIONS_FORBIDDEN');
      expect(accepted.error).toBeUndefined();
      expect((await findBlock(anchorId))?.permissions).toEqual(permissions);
      const reset = await sendOne(adminToken, [op('setPermission', anchorId, [], { permissions: null })]);
      expect(reset.error).toBeUndefined();
    });
  });

  describe('locked and trashed pages', () => {
    it('does not write a block below a locked page, nor the page itself, nor add to it', async () => {
      const onChild = await sendOne(adminToken, [op('update', lockedChildId, ['format'], { open: true })]);
      const onPage = await sendOne(adminToken, [op('update', lockedPageId, ['format'], { icon: null })]);
      const adding = await sendOne(adminToken, createParagraphOps(crypto.randomUUID(), lockedPageId));

      expect(onChild.error?.code).toBe('PAGE_LOCKED');
      expect(onPage.error?.code).toBe('PAGE_LOCKED');
      expect(adding.error?.code).toBe('PAGE_LOCKED');
    });

    it('does not write a block below a page in the trash', async () => {
      const onChild = await sendOne(adminToken, [op('update', trashedChildId, ['format'], { open: true })]);
      const adding = await sendOne(adminToken, createParagraphOps(crypto.randomUUID(), trashedPageId));

      expect(onChild.error?.code).toBe('PAGE_INVALID_LIFECYCLE');
      expect(adding.error?.code).toBe('PAGE_INVALID_LIFECYCLE');
    });
  });

  describe('what a client cannot write', () => {
    it.each(['version', 'text', 'textState', 'permissions', 'spaceId', 'createdById', 'lockedAt', 'lifecycle'])(
      'does not write %s through update',
      async (field) => {
        const outcome = await sendOne(workerToken, [op('update', anchorId, [], { [field]: 99 })]);

        expect(outcome.error?.code).toBe('BLOCK_FIELD_NOT_WRITABLE');
      },
    );

    it('does not accept a creation that carries a field the server owns', async () => {
      const blockId = crypto.randomUUID();

      const outcome = await sendOne(workerToken, [
        op('set', blockId, [], { id: blockId, parentId: pageId, type: 'paragraph', version: 50 }),
      ]);

      expect(outcome.error?.code).toBe('BLOCK_FIELD_NOT_WRITABLE');
    });

    it('refuses content that does not match the type, and a command it does not know', async () => {
      const invalidContent = await sendOne(workerToken, [op('update', anchorId, ['properties'], { level: 99 })]);
      const unknown = await sendOne(workerToken, [op('explode', anchorId, [], {})]);

      expect(invalidContent.error?.code).toBe('BLOCK_CONTENT_INVALID');
      expect(unknown.error?.code).toBe('BLOCK_OPERATION_INVALID');
    });
  });

  describe('bounds', () => {
    it('refuses more transactions or operations than a request may carry', async () => {
      const tooManyTransactions = Array.from({ length: 21 }, () =>
        transaction([op('update', anchorId, [], { alive: true })]),
      );
      const tooManyOperations = transaction(
        Array.from({ length: 101 }, () => op('update', anchorId, [], { alive: true })),
      );

      await send(workerToken, tooManyTransactions, HTTP_BAD_REQUEST);
      await send(workerToken, [tooManyOperations], HTTP_BAD_REQUEST);
      await send(workerToken, [], HTTP_BAD_REQUEST);
    });

    it('needs a signed-in user', async () => {
      await request(testApp.getServer()).post('/api/v1/transactions').send({ transactions: [] }).expect(401);
    });
  });

  describe('rate limit', () => {
    it('answers 429 to a user who sends more than the burst limit, and only to that user', async () => {
      const busy = await createUser('busy', 'WORKER');
      const attempt = (token: string) =>
        request(testApp.getServer())
          .post('/api/v1/transactions')
          .set('Authorization', `Bearer ${token}`)
          .send({ transactions: [transaction([op('update', anchorId, ['format'], { open: true })])] });

      const statuses = (
        await Promise.all(Array.from({ length: BLOCK_WRITE_BURST_LIMIT + 10 }, () => attempt(busy.token)))
      ).map((response) => response.status);

      expect(statuses.filter((status) => status === HTTP_TOO_MANY_REQUESTS).length).toBeGreaterThanOrEqual(10);
      expect(statuses).toContain(HTTP_OK);
      expect((await attempt(workerToken)).status).toBe(HTTP_OK);
    });
  });

  describe('notification', () => {
    const listen = async (): Promise<{ notifications: Notification[]; stop: () => Promise<void> }> => {
      const listener = new Client({ connectionString: testApp.get(ConfigService).getOrThrow<string>('DATABASE_URL') });
      await listener.connect();
      const notifications: Notification[] = [];
      listener.on('notification', (message) => {
        notifications.push(JSON.parse(message.payload ?? '{}') as Notification);
      });
      await listener.query('LISTEN block_versions');
      return { notifications, stop: () => listener.end() };
    };

    const waitFor = async (notifications: Notification[], transactionId: string): Promise<Notification | undefined> => {
      const deadline = Date.now() + NOTIFICATION_WAIT_MS;
      while (Date.now() < deadline) {
        const found = notifications.find((notification) => notification.transactionId === transactionId);
        if (found !== undefined) return found;
        await new Promise((resolve) => setTimeout(resolve, NOTIFICATION_POLL_MS));
      }
      return undefined;
    };

    it('announces the new versions on commit and says nothing for a rollback', async () => {
      const listener = await listen();
      try {
        const rolledBackId = crypto.randomUUID();
        const committedId = crypto.randomUUID();
        const paragraphId = crypto.randomUUID();

        await sendOne(workerToken, [op('update', hiddenChildId, [], { alive: false })], rolledBackId);
        const committed = await sendOne(workerToken, createParagraphOps(paragraphId, secondPageId), committedId);

        const announced = await waitFor(listener.notifications, committedId);
        expect(announced).toEqual({ blocks: committed.blocks, spaceId, transactionId: committedId });
        expect(listener.notifications.some((notification) => notification.transactionId === rolledBackId)).toBe(false);
      } finally {
        await listener.stop();
      }
    });

    it('does not announce a retry again', async () => {
      const listener = await listen();
      try {
        const transactionId = crypto.randomUUID();
        const operations = createParagraphOps(crypto.randomUUID(), secondPageId);

        await sendOne(workerToken, operations, transactionId);
        await waitFor(listener.notifications, transactionId);
        await sendOne(workerToken, operations, transactionId);
        await new Promise((resolve) => setTimeout(resolve, NOTIFICATION_POLL_MS * 4));

        expect(
          listener.notifications.filter((notification) => notification.transactionId === transactionId),
        ).toHaveLength(1);
      } finally {
        await listener.stop();
      }
    });
  });
});
