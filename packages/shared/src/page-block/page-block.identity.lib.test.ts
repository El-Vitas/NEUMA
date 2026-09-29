import { describe, expect, it } from 'bun:test';
import type { PageContent } from '../schemas/page-content.schema.js';
import { givePageBlocksTheirIds } from './page-block.identity.lib.js';

const doc = (...content: readonly unknown[]): PageContent =>
  ({ content, schemaVersion: 1, type: 'doc' }) as unknown as PageContent;

const text = (value: string) => ({ text: value, type: 'text' });

const countingIds = (): (() => string) => {
  let handedOut = 0;
  return () => {
    handedOut += 1;
    return `new-${String(handedOut)}`;
  };
};

describe('givePageBlocksTheirIds', () => {
  it('gives an id to every block that lacks one, inside and out', () => {
    const content = doc(
      { content: [text('Uno')], type: 'paragraph' },
      {
        content: [{ content: [{ content: [text('Ítem')], type: 'paragraph' }], type: 'list_item' }],
        type: 'bullet_list',
      },
    );

    const given = givePageBlocksTheirIds(content, countingIds());

    expect(given.content[0]).toMatchObject({ attrs: { id: 'new-1' } });
    expect(given.content[1]).toMatchObject({
      attrs: { id: 'new-2' },
      content: [{ attrs: { id: 'new-3' }, content: [{ attrs: { id: 'new-4' } }] }],
    });
  });

  it('keeps the ids blocks already have', () => {
    const content = doc({ attrs: { id: 'kept' }, content: [text('Uno')], type: 'paragraph' });

    expect(givePageBlocksTheirIds(content, countingIds()).content[0]).toMatchObject({ attrs: { id: 'kept' } });
  });

  it('gives a fresh id to the second of two blocks that share one, as the editor does', () => {
    const content = doc(
      { attrs: { id: 'twice' }, content: [text('Uno')], type: 'paragraph' },
      { attrs: { id: 'twice' }, content: [text('Dos')], type: 'paragraph' },
    );

    const given = givePageBlocksTheirIds(content, countingIds());

    expect(given.content.map((block) => block.attrs?.id)).toEqual(['twice', 'new-1']);
  });

  it('leaves what lives inside a line alone, since only blocks are pointed at', () => {
    const mention = { attrs: { label: 'Plan', pageId: 'p', spaceId: 's' }, type: 'mention' };
    const content = doc({ attrs: { id: 'p' }, content: [text('Ver '), mention], type: 'paragraph' });

    const given = givePageBlocksTheirIds(content, countingIds());

    expect(given.content[0]).toMatchObject({ content: [text('Ver '), mention] });
  });

  it('returns the same page when every block already has its own id', () => {
    const content = doc({ attrs: { id: 'a' }, content: [text('Uno')], type: 'paragraph' });

    expect(givePageBlocksTheirIds(content, countingIds())).toBe(content);
  });
});
