import { describe, expect, it } from 'bun:test';
import { type PageContent, pageContentSchema } from '@company-brain/shared';
import { buildMcpBlockUpdate, readMcpBlockPlace } from '@/modules/mcp/lib/mcp.block-update.lib';

const words = (text: string) => [{ text, type: 'text' }];
const page = (...content: readonly unknown[]): PageContent =>
  pageContentSchema.parse({ content, schemaVersion: 1, type: 'doc' });

const said = (...paragraphs: readonly string[]) => ({
  inline: words(paragraphs.join(' ')),
  paragraphs: paragraphs.map((paragraph) => ({ content: words(paragraph), type: 'paragraph' })),
  text: paragraphs.join('\n\n'),
});

const comment = { author: 'user-b', body: 'Revisar esto', createdAt: '2026-09-01T00:00:00.000Z', id: 'comment-1' };

const task = {
  attrs: { checked: false, id: 'task' },
  content: [{ attrs: { id: 'task-line' }, content: words('Revisar'), type: 'paragraph' }],
  type: 'task_item',
};
const boxHolds = [
  { attrs: { id: 'box-line' }, content: words('Uno'), type: 'paragraph' },
  {
    attrs: { id: 'box-list' },
    content: [
      {
        attrs: { id: 'box-item' },
        content: [{ attrs: { id: 'box-item-line' }, content: words('Dos'), type: 'paragraph' }],
        type: 'list_item',
      },
    ],
    type: 'bullet_list',
  },
];
const content = page(
  { attrs: { id: 'title', level: 2 }, content: words('Viejo'), type: 'heading' },
  { attrs: { id: 'tasks' }, content: [task], type: 'task_list' },
  { attrs: { id: 'code' }, content: [{ text: 'ls', type: 'text' }], type: 'code_block' },
  { attrs: { id: 'rule' }, type: 'divider' },
  {
    attrs: { backgroundColor: 'yellow', comments: [comment], id: 'note' },
    content: [{ attrs: { id: 'note-line' }, content: words('Ojo'), type: 'paragraph' }],
    type: 'callout',
  },
  { attrs: { id: 'box', summary: 'Detalles' }, content: boxHolds, type: 'toggle' },
);

const nodeOf = (edited: PageContent, index: number) => edited.content[index];

describe('readMcpBlockPlace', () => {
  it('reads each place the agent can ask for, the end of the page when it asks for none', () => {
    expect(readMcpBlockPlace({}).getValue()).toEqual({ at: 'end' });
    expect(readMcpBlockPlace({ at: 'start' }).getValue()).toEqual({ at: 'start' });
    expect(readMcpBlockPlace({ after: 'b' }).getValue()).toEqual({ after: 'b' });
    expect(readMcpBlockPlace({ before: 'b' }).getValue()).toEqual({ before: 'b' });
    expect(readMcpBlockPlace({ inside: 'b' }).getValue()).toEqual({ at: 'end', inside: 'b' });
  });

  it('refuses two places at once', () => {
    expect(readMcpBlockPlace({ after: 'a', before: 'b' }).getError()).toContain('one of');
  });
});

describe('buildMcpBlockUpdate', () => {
  it('paints a whole block and takes a colour off it, keeping what it says', () => {
    const painted = buildMcpBlockUpdate('title', { colors: { backgroundColor: 'yellow', textColor: 'red' } })(content);
    const cleared = buildMcpBlockUpdate('title', { colors: { textColor: null } })(painted.getValue());

    expect(nodeOf(painted.getValue(), 0)).toEqual({
      attrs: { backgroundColor: 'yellow', id: 'title', level: 2, textColor: 'red' },
      content: words('Viejo'),
      type: 'heading',
    });
    expect(nodeOf(cleared.getValue(), 0)?.attrs).toEqual({ backgroundColor: 'yellow', id: 'title', level: 2 });
  });

  it('gives a block new words and keeps its kind and its id', () => {
    const edited = buildMcpBlockUpdate('title', { words: said('Nuevo') })(content);

    expect(nodeOf(edited.getValue(), 0)).toEqual({
      attrs: { id: 'title', level: 2 },
      content: words('Nuevo'),
      type: 'heading',
    });
  });

  it('checks a checklist item and rewrites its line', () => {
    const edited = buildMcpBlockUpdate('task', {
      checked: true,
      words: said('Revisado'),
    })(content);

    expect(JSON.stringify(nodeOf(edited.getValue(), 1))).toContain('"checked":true');
    expect(JSON.stringify(nodeOf(edited.getValue(), 1))).toContain('Revisado');
  });

  it('keeps code words as written, without reading marks in them', () => {
    const edited = buildMcpBlockUpdate('code', { words: said('**ls -la**') })(content);

    expect(nodeOf(edited.getValue(), 2)).toEqual({
      attrs: { id: 'code' },
      content: [{ text: '**ls -la**', type: 'text' }],
      type: 'code_block',
    });
  });

  it('replaces a whole block, which keeps the id', () => {
    const edited = buildMcpBlockUpdate('rule', {
      replacement: { content: words('Ahora dice algo'), type: 'paragraph' },
    })(content);

    expect(nodeOf(edited.getValue(), 3)).toEqual({
      attrs: { id: 'rule' },
      content: words('Ahora dice algo'),
      type: 'paragraph',
    });
  });

  it('keeps the comments and colours of a replaced block, unless the new one brings its own colour', () => {
    const edited = buildMcpBlockUpdate('note', {
      replacement: { attrs: { backgroundColor: 'blue' }, content: words('Ahora es un párrafo'), type: 'paragraph' },
    })(content);

    expect(nodeOf(edited.getValue(), 4)).toEqual({
      attrs: { backgroundColor: 'blue', comments: [comment], id: 'note' },
      content: words('Ahora es un párrafo'),
      type: 'paragraph',
    });
  });

  it('writes the words of a callout in paragraphs, the way inserting one does', () => {
    const edited = buildMcpBlockUpdate('note', { words: said('Primero', 'Después') })(content);

    expect(nodeOf(edited.getValue(), 4)).toEqual({
      attrs: { backgroundColor: 'yellow', comments: [comment], id: 'note' },
      content: [
        { content: words('Primero'), type: 'paragraph' },
        { content: words('Después'), type: 'paragraph' },
      ],
      type: 'callout',
    });
  });

  it('refuses new words for a toggle that holds other blocks, and says how to change them', () => {
    expect(buildMcpBlockUpdate('box', { words: said('Otro') })(content).getError()).toContain('one by one');
  });

  it('gives a toggle a new summary without touching what it holds', () => {
    const edited = buildMcpBlockUpdate('box', { summary: 'Más detalles' })(content);

    expect(nodeOf(edited.getValue(), 5)).toEqual({
      attrs: { id: 'box', summary: 'Más detalles' },
      content: boxHolds,
      type: 'toggle',
    });
  });

  it('refuses a summary for what is not a toggle', () => {
    expect(buildMcpBlockUpdate('title', { summary: 'x' })(content).getError()).toContain('toggle');
  });

  it('says what to do with a block that has no words of its own', () => {
    expect(buildMcpBlockUpdate('rule', { words: said('x') })(content).getError()).toContain('replacement');
  });

  it('refuses to check what is not a checklist item', () => {
    expect(buildMcpBlockUpdate('title', { checked: true })(content).getError()).toContain('checklist');
  });

  it('says which block is gone', () => {
    expect(buildMcpBlockUpdate('gone', { checked: true })(content).getError()).toContain('gone');
  });
});
