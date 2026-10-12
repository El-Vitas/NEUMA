import { describe, expect, it } from 'bun:test';
import { listMcpBlockComments, readMcpBlockInContext, takeMcpPagePart } from '@/modules/mcp/lib/mcp.blocks.lib';

const paragraph = (id: string, words: string) => ({
  attrs: { id },
  content: [{ text: words, type: 'text' }],
  type: 'paragraph',
});

const nodes = [
  paragraph('top', 'Arriba'),
  {
    attrs: { id: 'list' },
    content: [{ attrs: { id: 'item' }, content: [paragraph('line', 'Ítem')], type: 'list_item' }],
    type: 'bullet_list',
  },
];

describe('readMcpBlockInContext', () => {
  it('gives a block that stands on its own as it is', () => {
    expect(readMcpBlockInContext(nodes, 'top')).toEqual(paragraph('top', 'Arriba'));
  });

  it('gives an item inside a list like its own, without naming that list', () => {
    expect(readMcpBlockInContext(nodes, 'item')).toEqual({
      attrs: {},
      content: [{ attrs: { id: 'item' }, content: [paragraph('line', 'Ítem')], type: 'list_item' }],
      type: 'bullet_list',
    });
  });

  it('says nothing of a block that is not there', () => {
    expect(readMcpBlockInContext(nodes, 'gone')).toBeNull();
  });
});

describe('listMcpBlockComments', () => {
  it('lists what was said on each block, with the block it was said on, however deep', () => {
    const comment = { author: 'Ana', body: 'Revisar la fecha', createdAt: '2026-09-01T10:00:00.000Z', id: 'c1' };
    const withComments = [
      { ...paragraph('a', 'Uno'), attrs: { comments: [comment], id: 'a' } },
      {
        attrs: { id: 'quote' },
        content: [{ ...paragraph('b', 'Dos'), attrs: { comments: [{ ...comment, id: 'c2' }], id: 'b' } }],
        type: 'blockquote',
      },
    ];

    expect(listMcpBlockComments(withComments)).toEqual([
      { author: 'Ana', blockId: 'a', body: 'Revisar la fecha', createdAt: '2026-09-01T10:00:00.000Z', id: 'c1' },
      { author: 'Ana', blockId: 'b', body: 'Revisar la fecha', createdAt: '2026-09-01T10:00:00.000Z', id: 'c2' },
    ]);
  });

  it('skips a comment that is not shaped like one', () => {
    expect(listMcpBlockComments([{ ...paragraph('a', 'Uno'), attrs: { comments: ['suelto'], id: 'a' } }])).toEqual([]);
  });
});

describe('takeMcpPagePart', () => {
  const many = Array.from({ length: 10 }, (_unused, at) => paragraph(`p${String(at)}`, 'x'.repeat(100)));

  it('hands over the whole page when it fits', () => {
    expect(takeMcpPagePart(many, 0, 100_000)).toEqual({ nextStart: null, nodes: many });
  });

  it('cuts between blocks and says where the next part starts', () => {
    const first = takeMcpPagePart(many, 0, 350);
    const second = takeMcpPagePart(many, first.nextStart ?? 0, 350);

    expect(first.nodes.length).toBeGreaterThan(0);
    expect(first.nodes.length).toBeLessThan(many.length);
    expect(second.nodes[0]).toEqual(many[first.nodes.length]);
  });

  it('always hands over at least one block, even one larger than the part', () => {
    expect(takeMcpPagePart(many, 0, 10).nodes).toHaveLength(1);
  });

  it('hands over nothing past the end', () => {
    expect(takeMcpPagePart(many, 50, 1000)).toEqual({ nextStart: null, nodes: [] });
  });
});
