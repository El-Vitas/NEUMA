import { describe, expect, it } from 'bun:test';
import { parseBlockContent } from '@neuma/shared';
import { diffBlockLinks, extractBlockLinkTargets } from '@/modules/blocks/domain/block.link.domain';
import { buildVersionNotification } from '@/modules/blocks/domain/block.notification.domain';
import type { BlockLinkDraft, StoredBlockLink } from '@/modules/blocks/domain/block.transaction.domain.types';

const contentOf = (type: string, properties: unknown) => {
  const parsed = parseBlockContent(type, properties, {});
  if (parsed.isFail()) throw new Error(JSON.stringify(parsed.getError().issues));
  return parsed.getValue();
};

const mention = (pageId: string) => ({ insert: { mention: { label: 'x', pageId, spaceId: 's' } } });

describe('extractBlockLinkTargets', () => {
  it('finds every mention in the rich text once', () => {
    const content = contentOf('paragraph', { title: [mention('a'), { insert: ' and ' }, mention('b'), mention('a')] });

    expect(extractBlockLinkTargets('src', content)).toEqual([
      { kind: 'mention', targetBlockId: 'a' },
      { kind: 'mention', targetBlockId: 'b' },
    ]);
  });

  it('reads the reference of a subpage, a synced block and a collection', () => {
    expect(extractBlockLinkTargets('src', contentOf('subpage', { label: 'Sub', pageId: 'p', spaceId: 's' }))).toEqual([
      { kind: 'subpage', targetBlockId: 'p' },
    ]);
    expect(
      extractBlockLinkTargets('src', contentOf('synced', { blockId: 'origin', pageId: 'p', spaceId: 's' })),
    ).toEqual([{ kind: 'synced', targetBlockId: 'origin' }]);
    expect(extractBlockLinkTargets('src', contentOf('collection', { pageId: 'c', spaceId: 's' }))).toEqual([
      { kind: 'collection', targetBlockId: 'c' },
    ]);
  });

  it('links nothing for a block without references, or one that points at itself', () => {
    expect(extractBlockLinkTargets('src', contentOf('divider', {}))).toEqual([]);
    expect(extractBlockLinkTargets('src', contentOf('paragraph', { title: [mention('src')] }))).toEqual([]);
  });
});

describe('diffBlockLinks', () => {
  const draft = (targetBlockId: string, sourcePageId = 'page'): BlockLinkDraft => ({
    kind: 'mention',
    sourceBlockId: 'src',
    sourcePageId,
    targetBlockId,
  });
  const stored = (id: string, targetBlockId: string, sourcePageId = 'page'): StoredBlockLink => ({
    ...draft(targetBlockId, sourcePageId),
    id,
  });

  it('keeps the links that stay, deletes the ones that went and adds the new ones', () => {
    const diff = diffBlockLinks([stored('l1', 'a'), stored('l2', 'b')], [draft('b'), draft('c')]);

    expect(diff.deleteIds).toEqual(['l1']);
    expect(diff.drafts).toEqual([draft('c')]);
  });

  it('replaces a link whose page changed', () => {
    const diff = diffBlockLinks([stored('l1', 'a', 'old')], [draft('a', 'new')]);

    expect(diff).toEqual({ deleteIds: ['l1'], drafts: [draft('a', 'new')] });
  });
});

describe('buildVersionNotification', () => {
  it('lists the blocks and their versions', () => {
    const payload: unknown = JSON.parse(buildVersionNotification('t1', 's1', [{ id: 'b1', version: 3 }]));

    expect(payload).toEqual({ blocks: [{ id: 'b1', version: 3 }], spaceId: 's1', transactionId: 't1' });
  });

  it('carries the views a transaction touched and the moves and permission changes of its blocks', () => {
    const payload: unknown = JSON.parse(
      buildVersionNotification(
        't1',
        's1',
        [{ hasAccessChange: true, id: 'b1', previousParentId: 'old', version: 3 }],
        [{ id: 'v1', pageId: 'p1', version: 2 }],
      ),
    );

    expect(payload).toEqual({
      blocks: [{ hasAccessChange: true, id: 'b1', previousParentId: 'old', version: 3 }],
      spaceId: 's1',
      transactionId: 't1',
      views: [{ id: 'v1', pageId: 'p1', version: 2 }],
    });
  });

  it('says it was cut instead of exceeding what Postgres allows', () => {
    const many = Array.from({ length: 400 }, (_, index) => ({
      id: `block-${String(index).padStart(36, '0')}`,
      version: index,
    }));

    const payload = buildVersionNotification('t1', 's1', many);

    expect(Buffer.byteLength(payload)).toBeLessThan(8000);
    expect(JSON.parse(payload)).toEqual({ spaceId: 's1', transactionId: 't1', truncated: true });
  });
});
