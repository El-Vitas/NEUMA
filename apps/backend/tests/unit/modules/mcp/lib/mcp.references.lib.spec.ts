import { describe, expect, it } from 'bun:test';
import { MCP_REDACTED_REFERENCE_LABEL } from '@/modules/mcp/constants/mcp.constants';
import {
  hideUnreachableReferences,
  listReferencedPageIds,
  settleWrittenReferences,
} from '@/modules/mcp/lib/mcp.references.lib';
import type { McpPagePlace } from '@/modules/mcp/types/mcp.types';

const text = (value: string) => ({ text: value, type: 'text' });
const mention = (pageId: string, label: string, spaceId = 's') => ({
  attrs: { label, pageId, spaceId },
  type: 'mention',
});

const nodes = [
  {
    attrs: { id: 'p' },
    content: [text('Ver '), mention('seen', 'Nombre viejo', 'old-space'), text(' y '), mention('hidden', 'Secreta')],
    type: 'paragraph',
  },
  { attrs: { id: 'sub', label: 'Sueldos', pageId: 'hidden', spaceId: 's' }, type: 'subpage' },
  { attrs: { blockId: 'b', id: 'sync', pageId: 'hidden', spaceId: 's' }, type: 'synced' },
  { attrs: { id: 'col', pageId: 'seen', spaceId: 'old-space' }, type: 'collection' },
  {
    attrs: { id: 'quote' },
    content: [{ attrs: { id: 'inner' }, content: [mention('hidden', 'Escondida')], type: 'paragraph' }],
    type: 'blockquote',
  },
];

const seen: McpPagePlace = { id: 'seen', spaceId: 'new-space', title: 'Nombre de hoy' };
const reachable = new Map([[seen.id, seen]]);

describe('listReferencedPageIds', () => {
  it('lists every page the content points at, once, however deep', () => {
    expect(listReferencedPageIds(nodes)).toEqual(['seen', 'hidden']);
  });
});

describe('links to pages', () => {
  const linked = (pageId: string, words: string) => ({
    marks: [{ attrs: { href: `/spaces/s/pages/${pageId}` }, type: 'link' }, { type: 'strong' }],
    text: words,
    type: 'text',
  });
  const page = [
    { attrs: { id: 'p' }, content: [linked('seen', 'abierta'), linked('hidden', 'cerrada')], type: 'paragraph' },
  ];

  it('counts the pages a link leads to among the ones the content points at', () => {
    expect(listReferencedPageIds(page)).toEqual(['seen', 'hidden']);
  });

  it('keeps the words of a link to a page it cannot see, but not where the link led', () => {
    expect(hideUnreachableReferences(page, reachable)).toEqual([
      {
        attrs: { id: 'p' },
        content: [linked('seen', 'abierta'), { marks: [{ type: 'strong' }], text: 'cerrada', type: 'text' }],
        type: 'paragraph',
      },
    ]);
  });
});

describe('hideUnreachableReferences', () => {
  const hidden = hideUnreachableReferences(nodes, reachable);

  it('names a page it can see as it is called today, where it lives today', () => {
    expect(hidden[0]).toMatchObject({
      content: [
        text('Ver '),
        mention('seen', 'Nombre de hoy', 'new-space'),
        text(' y '),
        text(MCP_REDACTED_REFERENCE_LABEL),
      ],
    });
    expect(hidden[3]).toEqual({ attrs: { id: 'col', pageId: 'seen', spaceId: 'new-space' }, type: 'collection' });
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

describe('settleWrittenReferences', () => {
  const person = (userId: string, label: string) => ({ attrs: { label, userId }, type: 'person' });
  const people = [{ id: 'u-1', name: 'Ana Pérez' }];
  const written = (...inline: readonly unknown[]) => [{ content: inline, type: 'paragraph' }];

  it('stores a mention with the name and space the page has today', () => {
    const settled = settleWrittenReferences(written(mention('seen', 'Como lo escribió el agente')), reachable, people);

    expect(settled.getValue()).toEqual(written(mention('seen', 'Nombre de hoy', 'new-space')));
  });

  it('refuses a mention of a page the token cannot reach, the same as one that does not exist', () => {
    const settled = settleWrittenReferences(written(mention('hidden', 'Secreta')), reachable, people);

    expect(settled.getError()).toContain('not accessible');
    expect(settled.getError()).not.toContain('Secreta');
  });

  it('stores a sub-page with the name and space of the page it shows', () => {
    const settled = settleWrittenReferences(
      [{ attrs: { label: '', pageId: 'seen', spaceId: '' }, type: 'subpage' }],
      reachable,
      people,
    );

    expect(settled.getValue()).toEqual([
      { attrs: { label: 'Nombre de hoy', pageId: 'seen', spaceId: 'new-space' }, type: 'subpage' },
    ]);
  });

  it('refuses a button that adds rows to a page the token cannot reach, and checks what the button writes', () => {
    const rowButton = (pageId: string, inline: readonly unknown[]) => ({
      attrs: { deed: 'row', label: 'Nueva', pageId, spaceId: '' },
      content: [{ content: inline, type: 'paragraph' }],
      type: 'button',
    });

    expect(settleWrittenReferences([rowButton('hidden', [])], reachable, people).getError()).toContain(
      'not accessible',
    );
    expect(
      settleWrittenReferences([rowButton('seen', [mention('hidden', 'Secreta')])], reachable, people).getError(),
    ).toContain('not accessible');
  });

  it('leaves alone a button that only writes text, when reading and when writing', () => {
    const textButton = {
      attrs: { deed: 'blocks', label: 'Otra vez' },
      content: [{ content: [text('Hola')], type: 'paragraph' }],
      type: 'button',
    };

    expect(hideUnreachableReferences([textButton], reachable)).toEqual([textButton]);
    expect(settleWrittenReferences([textButton], reachable, people).getValue()).toEqual([textButton]);
  });

  it('names a person as the workspace names them, and refuses somebody who is not there', () => {
    expect(settleWrittenReferences(written(person('u-1', 'ana')), reachable, people).getValue()).toEqual(
      written(person('u-1', 'Ana Pérez')),
    );
    expect(settleWrittenReferences(written(person('u-9', 'Nadie')), reachable, people).getError()).toContain('u-9');
  });
});
