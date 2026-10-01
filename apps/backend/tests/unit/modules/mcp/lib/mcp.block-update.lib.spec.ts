import { describe, expect, it } from 'bun:test';
import { type PageContent, pageContentSchema } from '@company-brain/shared';
import { buildMcpBlockUpdate, readMcpBlockPlace } from '@/modules/mcp/lib/mcp.block-update.lib';

const words = (text: string) => [{ text, type: 'text' }];
const page = (...content: readonly unknown[]): PageContent =>
  pageContentSchema.parse({ content, schemaVersion: 1, type: 'doc' });

const task = {
  attrs: { checked: false, id: 'task' },
  content: [{ attrs: { id: 'task-line' }, content: words('Revisar'), type: 'paragraph' }],
  type: 'task_item',
};
const content = page(
  { attrs: { id: 'title', level: 2 }, content: words('Viejo'), type: 'heading' },
  { attrs: { id: 'tasks' }, content: [task], type: 'task_list' },
  { attrs: { id: 'code' }, content: [{ text: 'ls', type: 'text' }], type: 'code_block' },
  { attrs: { id: 'rule' }, type: 'divider' },
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
    const edited = buildMcpBlockUpdate('title', { words: { inline: words('Nuevo'), text: 'Nuevo' } })(content);

    expect(nodeOf(edited.getValue(), 0)).toEqual({
      attrs: { id: 'title', level: 2 },
      content: words('Nuevo'),
      type: 'heading',
    });
  });

  it('checks a checklist item and rewrites its line', () => {
    const edited = buildMcpBlockUpdate('task', {
      checked: true,
      words: { inline: words('Revisado'), text: 'Revisado' },
    })(content);

    expect(JSON.stringify(nodeOf(edited.getValue(), 1))).toContain('"checked":true');
    expect(JSON.stringify(nodeOf(edited.getValue(), 1))).toContain('Revisado');
  });

  it('keeps code words as written, without reading marks in them', () => {
    const edited = buildMcpBlockUpdate('code', { words: { inline: words('ignored'), text: '**ls -la**' } })(content);

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

  it('says what to do with a block that has no words of its own', () => {
    expect(buildMcpBlockUpdate('rule', { words: { inline: words('x'), text: 'x' } })(content).getError()).toContain(
      'replacement',
    );
  });

  it('refuses to check what is not a checklist item', () => {
    expect(buildMcpBlockUpdate('title', { checked: true })(content).getError()).toContain('checklist');
  });

  it('says which block is gone', () => {
    expect(buildMcpBlockUpdate('gone', { checked: true })(content).getError()).toContain('gone');
  });
});
