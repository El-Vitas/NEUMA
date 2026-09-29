import { describe, expect, it } from 'bun:test';
import { MCP_REDACTED_REFERENCE_LABEL } from '@/modules/mcp/constants/mcp.constants';
import { hideUnreachableReferences, listReferencedPageIds } from '@/modules/mcp/lib/mcp.references.lib';

const text = (value: string) => ({ text: value, type: 'text' });
const mention = (pageId: string, label: string) => ({ attrs: { label, pageId, spaceId: 's' }, type: 'mention' });

const nodes = [
  {
    attrs: { id: 'p' },
    content: [text('Ver '), mention('seen', 'Visible'), text(' y '), mention('hidden', 'Secreta')],
    type: 'paragraph',
  },
  { attrs: { id: 'sub', label: 'Sueldos', pageId: 'hidden', spaceId: 's' }, type: 'subpage' },
  { attrs: { blockId: 'b', id: 'sync', pageId: 'hidden', spaceId: 's' }, type: 'synced' },
  { attrs: { id: 'col', pageId: 'seen', spaceId: 's' }, type: 'collection' },
  {
    attrs: { id: 'quote' },
    content: [{ attrs: { id: 'inner' }, content: [mention('hidden', 'Escondida')], type: 'paragraph' }],
    type: 'blockquote',
  },
];

describe('listReferencedPageIds', () => {
  it('lists every page the content points at, once, however deep', () => {
    expect(listReferencedPageIds(nodes)).toEqual(['seen', 'hidden']);
  });
});

describe('hideUnreachableReferences', () => {
  const hidden = hideUnreachableReferences(nodes, new Set(['seen']));

  it('keeps what points at a page the agent can see as it is', () => {
    expect(hidden[0]).toMatchObject({
      content: [text('Ver '), mention('seen', 'Visible'), text(' y '), text(MCP_REDACTED_REFERENCE_LABEL)],
    });
    expect(hidden[3]).toEqual(nodes[3]);
  });

  it('turns a mention of a page it cannot see into a plain word that names nothing', () => {
    expect(JSON.stringify(hidden)).not.toContain('Secreta');
    expect(JSON.stringify(hidden)).not.toContain('Escondida');
  });

  it('turns a block that shows a page it cannot see into a line that names nothing, keeping the block id', () => {
    expect(hidden[1]).toEqual({
      attrs: { id: 'sub' },
      content: [text(MCP_REDACTED_REFERENCE_LABEL)],
      type: 'paragraph',
    });
    expect(hidden[2]).toEqual({
      attrs: { id: 'sync' },
      content: [text(MCP_REDACTED_REFERENCE_LABEL)],
      type: 'paragraph',
    });
    expect(JSON.stringify(hidden)).not.toContain('"hidden"');
  });
});
