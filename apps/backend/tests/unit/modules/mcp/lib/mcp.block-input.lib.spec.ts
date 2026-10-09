import { describe, expect, it } from 'bun:test';
import { givePageBlocksTheirIds, type PageContent, pageContentSchema } from '@company-brain/shared';
import { buildMcpBlockNodes } from '@/modules/mcp/lib/mcp.block-input.lib';
import type { McpBlockInput } from '@/modules/mcp/types/mcp.pages.types';

const build = (...blocks: readonly McpBlockInput[]) => buildMcpBlockNodes(blocks);

const asPage = (content: readonly unknown[]): PageContent =>
  pageContentSchema.parse({ content, schemaVersion: 1, type: 'doc' });

describe('buildMcpBlockNodes', () => {
  it('writes a paragraph and a heading with their inline marks', () => {
    expect(
      build({ text: 'Hola **mundo**', type: 'paragraph' }, { level: 2, text: 'Título', type: 'heading' }).getValue(),
    ).toEqual([
      {
        content: [
          { text: 'Hola ', type: 'text' },
          { marks: [{ type: 'strong' }], text: 'mundo', type: 'text' },
        ],
        type: 'paragraph',
      },
      { attrs: { level: 2 }, content: [{ text: 'Título', type: 'text' }], type: 'heading' },
    ]);
  });

  it('writes a list with nested items of the same kind', () => {
    const [list] = build({ items: ['Uno', { items: ['Uno.a'], text: 'Dos' }], type: 'bullet_list' }).getValue();

    expect(list).toEqual({
      content: [
        { content: [{ content: [{ text: 'Uno', type: 'text' }], type: 'paragraph' }], type: 'list_item' },
        {
          content: [
            { content: [{ text: 'Dos', type: 'text' }], type: 'paragraph' },
            {
              content: [
                { content: [{ content: [{ text: 'Uno.a', type: 'text' }], type: 'paragraph' }], type: 'list_item' },
              ],
              type: 'bullet_list',
            },
          ],
          type: 'list_item',
        },
      ],
      type: 'bullet_list',
    });
  });

  it('writes a checklist with what is checked', () => {
    const [list] = build({
      items: [{ checked: true, text: 'Hecho' }, { text: 'Pendiente' }],
      type: 'task_list',
    }).getValue();

    expect(list).toMatchObject({
      content: [
        { attrs: { checked: true }, type: 'task_item' },
        { attrs: { checked: false }, type: 'task_item' },
      ],
      type: 'task_list',
    });
  });

  /** Un diagrama hecho con espacios solo sobrevive en un bloque de código: nada de lo escrito se lee como marca. */
  it('keeps code exactly as written, spaces and markers included', () => {
    const text = '┌─────┐\n│ **a** │\n└─────┘';

    expect(build({ language: 'plain', text, type: 'code_block' }).getValue()).toEqual([
      { attrs: { language: 'plain' }, content: [{ text, type: 'text' }], type: 'code_block' },
    ]);
  });

  it('writes a real table, with a header row and rows filled to its width', () => {
    const [table] = build({
      header: ['Servicio', 'Estado'],
      rows: [['Portal', 'OK'], ['Backend']],
      type: 'table',
    }).getValue();

    expect(table).toMatchObject({
      content: [
        { content: [{ type: 'table_header' }, { type: 'table_header' }], type: 'table_row' },
        { content: [{ type: 'table_cell' }, { type: 'table_cell' }], type: 'table_row' },
        {
          content: [{ type: 'table_cell' }, { content: [{ content: [], type: 'paragraph' }], type: 'table_cell' }],
          type: 'table_row',
        },
      ],
      type: 'table',
    });
  });

  it('writes a diagram and a formula as the blocks the page draws, showing the drawing unless told otherwise', () => {
    const [diagram, formula] = build(
      { source: 'sequenceDiagram\n  A->>B: Hola', type: 'diagram' },
      { latex: '\\int_0^1 x\\,dx', type: 'formula', view: 'both' },
    ).getValue();

    expect(diagram).toEqual({
      attrs: { language: 'mermaid' },
      content: [{ text: 'sequenceDiagram\n  A->>B: Hola', type: 'text' }],
      type: 'code_block',
    });
    expect(formula).toEqual({
      attrs: { language: 'latex', shown: 'both' },
      content: [{ text: '\\int_0^1 x\\,dx', type: 'text' }],
      type: 'code_block',
    });
  });

  /** El nombre y el espacio de lo que se muestra los pone Company Brain después, con los de hoy. */
  it('points a sub-page, a collection and a row button at the pages named', () => {
    const page = '11111111-1111-4111-8111-111111111111';
    const collection = '22222222-2222-4222-8222-222222222222';

    const [subpage, embedded, button] = build(
      { page, type: 'subpage' },
      { collection: `/spaces/s/pages/${collection}`, type: 'collection', view: 'Tablero' },
      { addsRowTo: collection, label: 'Nueva tarea', text: 'Tarea sin nombre', type: 'button' },
    ).getValue();

    expect(subpage).toMatchObject({ attrs: { pageId: page }, type: 'subpage' });
    expect(embedded).toMatchObject({ attrs: { pageId: collection, viewName: 'Tablero' }, type: 'collection' });
    expect(button).toMatchObject({ attrs: { deed: 'row', label: 'Nueva tarea', pageId: collection }, type: 'button' });
  });

  it('refuses a sub-page named by something that is not a page link or id', () => {
    expect(build({ page: 'no es un enlace', type: 'subpage' }).getError()).toContain('Block 1');
  });

  it('refuses a row wider than the header, saying which', () => {
    expect(build({ header: ['A'], rows: [['1', '2']], type: 'table' }).getError()).toContain('row 1');
  });

  it('builds blocks a page accepts, every kind of them', () => {
    const built = build(
      { text: 'Párrafo', type: 'paragraph' },
      { items: ['Uno'], type: 'ordered_list' },
      { text: 'Cita\n\nSegundo párrafo', type: 'blockquote' },
      { icon: 'warning', text: 'Cuidado', type: 'callout' },
      { type: 'divider' },
      { summary: 'Más', text: 'Adentro', type: 'toggle' },
      { summary: 'Vacío', type: 'toggle' },
      { source: 'flowchart LR\n  A --> B', type: 'diagram' },
      { latex: 'a^2 + b^2 = c^2', type: 'formula' },
      { type: 'table_of_contents' },
      { label: 'Repetir', place: 'bottom', text: 'Otra vez $x$', type: 'button' },
    ).getValue();

    expect(() => asPage(built)).not.toThrow();
  });

  /** Al guardarse, cada bloque recibe su id; una lista numerada sin su número de inicio dejaba de ser válida ahí. */
  it('builds blocks that stay valid once each one is given its id', () => {
    const built = build(
      { items: ['Uno', { items: ['Uno.a'], text: 'Dos' }], type: 'ordered_list' },
      { items: [{ text: 'Hecho' }], type: 'task_list' },
      { header: ['A'], rows: [['1']], type: 'table' },
      { summary: 'Más', type: 'toggle' },
      { icon: 'info', text: 'Nota', type: 'callout' },
    ).getValue();

    expect(() => givePageBlocksTheirIds(asPage(built), () => crypto.randomUUID())).not.toThrow();
  });

  it('writes columns side by side, each with blocks of its own, valid once given their ids', () => {
    const [columns] = build({
      columns: [[{ text: 'Izquierda', type: 'paragraph' }], [{ items: ['a', 'b'], type: 'bullet_list' }]],
      type: 'columns',
    }).getValue();

    expect(columns).toMatchObject({
      content: [
        { content: [{ content: [{ text: 'Izquierda' }], type: 'paragraph' }], type: 'column' },
        { content: [{ type: 'bullet_list' }], type: 'column' },
      ],
      type: 'column_list',
    });
    expect(() => givePageBlocksTheirIds(asPage([columns]), () => crypto.randomUUID())).not.toThrow();
  });

  it('says which column of which block has a block it could not write', () => {
    expect(
      build({
        columns: [[{ text: 'ok', type: 'paragraph' }], [{ text: '[x](javascript:1)', type: 'paragraph' }]],
        type: 'columns',
      }).getError(),
    ).toContain('Block 1: column 2');
  });

  it('writes a link card with the words the agent gives it, and a video from a known provider', () => {
    const built = build(
      { description: 'La guía', title: 'Docs', type: 'bookmark', url: 'https://example.com/guia' },
      { type: 'embed', url: 'https://www.youtube.com/watch?v=abc' },
    ).getValue();

    expect(built).toEqual([
      { attrs: { description: 'La guía', title: 'Docs', url: 'https://example.com/guia' }, type: 'bookmark' },
      { attrs: { provider: 'youtube', url: 'https://www.youtube.com/watch?v=abc' }, type: 'embed' },
    ]);
    expect(() => givePageBlocksTheirIds(asPage(built), () => crypto.randomUUID())).not.toThrow();
  });

  it('refuses a video from a site the page does not play, and a link card that is not a web address', () => {
    expect(build({ type: 'embed', url: 'https://example.com/video' }).getError()).toContain('YouTube');
    expect(build({ type: 'bookmark', url: 'javascript:alert(1)' }).getError()).toContain('http');
  });

  it('writes a synced block pointing at a block of another page, its space settled later', () => {
    const page = '44444444-4444-4444-8444-444444444444';

    expect(build({ block: 'b-1', page, type: 'synced' }).getValue()).toEqual([
      { attrs: { blockId: 'b-1', pageId: page, spaceId: '' }, type: 'synced' },
    ]);
  });

  it('says which block has a link the page would not keep', () => {
    expect(
      build({ text: 'ok', type: 'paragraph' }, { text: '[x](javascript:1)', type: 'paragraph' }).getError(),
    ).toContain('Block 2');
  });
});
