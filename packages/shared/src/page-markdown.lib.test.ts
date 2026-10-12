import { describe, expect, it } from 'bun:test';
import { readMarkdownInline } from './page-markdown.inline.lib.js';
import { writePageAsAnchoredMarkdown, writePageAsMarkdown } from './page-markdown.lib.js';
import { type PageContent, pageContentSchema } from './schemas/page-content.schema.js';

const doc = (...content: readonly unknown[]): PageContent =>
  pageContentSchema.parse({ content, schemaVersion: 1, type: 'doc' });

const text = (value: string, marks?: readonly unknown[]) => ({ marks, text: value, type: 'text' });
const paragraph = (...content: readonly unknown[]) => ({ content, type: 'paragraph' });

describe('writePageAsMarkdown — what Markdown already says', () => {
  it('writes a paragraph as its own line', () => {
    expect(writePageAsMarkdown(doc(paragraph(text('Hola mundo'))))).toBe('Hola mundo');
  });

  it('writes a heading with as many hashes as its level', () => {
    const content = doc({ attrs: { level: 2 }, content: [text('Un título')], type: 'heading' });

    expect(writePageAsMarkdown(content)).toBe('## Un título');
  });

  it('carries the marks a word wears', () => {
    const content = doc(
      paragraph(text('normal '), text('fuerte', [{ type: 'strong' }]), text(' y '), text('torcido', [{ type: 'em' }])),
    );

    expect(writePageAsMarkdown(content)).toBe('normal **fuerte** y *torcido*');
  });

  it('writes a link as a link, which is what it is', () => {
    const content = doc(paragraph(text('ver', [{ attrs: { href: 'https://ejemplo.com' }, type: 'link' }])));

    expect(writePageAsMarkdown(content)).toBe('[ver](https://ejemplo.com)');
  });

  it('writes a bullet list one item to a line', () => {
    const content = doc({
      content: [
        { content: [paragraph(text('uno'))], type: 'list_item' },
        { content: [paragraph(text('dos'))], type: 'list_item' },
      ],
      type: 'bullet_list',
    });

    expect(writePageAsMarkdown(content)).toBe('- uno\n- dos');
  });

  it('numbers an ordered list', () => {
    const content = doc({
      content: [
        { content: [paragraph(text('uno'))], type: 'list_item' },
        { content: [paragraph(text('dos'))], type: 'list_item' },
      ],
      type: 'ordered_list',
    });

    expect(writePageAsMarkdown(content)).toBe('1. uno\n2. dos');
  });

  it('ticks a task that is done and leaves the rest empty', () => {
    const content = doc({
      content: [
        { attrs: { checked: true }, content: [paragraph(text('hecho'))], type: 'task_item' },
        { attrs: { checked: false }, content: [paragraph(text('pendiente'))], type: 'task_item' },
      ],
      type: 'task_list',
    });

    expect(writePageAsMarkdown(content)).toBe('- [x] hecho\n- [ ] pendiente');
  });

  it('fences code and says what language it is in', () => {
    const content = doc({
      attrs: { language: 'typescript' },
      content: [{ text: 'const x = 1;', type: 'text' }],
      type: 'code_block',
    });

    expect(writePageAsMarkdown(content)).toBe('```typescript\nconst x = 1;\n```');
  });

  it('writes a table the way Markdown tables are written', () => {
    const content = doc({
      content: [
        {
          content: [
            { content: [paragraph(text('Nombre'))], type: 'table_header' },
            { content: [paragraph(text('Estado'))], type: 'table_header' },
          ],
          type: 'table_row',
        },
        {
          content: [
            { content: [paragraph(text('Uno'))], type: 'table_cell' },
            { content: [paragraph(text('Listo'))], type: 'table_cell' },
          ],
          type: 'table_row',
        },
      ],
      type: 'table',
    });

    expect(writePageAsMarkdown(content)).toBe('| Nombre | Estado |\n| --- | --- |\n| Uno | Listo |');
  });

  it('quotes a quote and rules a divider', () => {
    const content = doc({ content: [paragraph(text('dicho'))], type: 'blockquote' }, { type: 'divider' });

    expect(writePageAsMarkdown(content)).toBe('> dicho\n\n---');
  });
});

describe('writePageAsMarkdown — what Markdown does not say', () => {
  it('writes a mention as a link to the page it names, which is what it means', () => {
    const content = doc(
      paragraph({ attrs: { label: 'Manual', pageId: 'page-a', spaceId: 'space-a' }, type: 'mention' }),
    );

    expect(writePageAsMarkdown(content)).toBe('[Manual](/spaces/space-a/pages/page-a)');
  });

  it('names a person without pretending they are a page', () => {
    const userId = '01a10000-0000-7000-8000-0000000000a1';
    const content = doc(paragraph({ attrs: { label: 'Ana', userId }, type: 'person' }));

    expect(writePageAsMarkdown(content)).toBe(`[@Ana](person:${userId})`);
  });

  it('keeps the day a date meant, not merely how it was drawn', () => {
    const content = doc(paragraph({ attrs: { at: '2026-08-21' }, type: 'date' }));

    expect(writePageAsMarkdown(content)).toBe('[2026-08-21](date:2026-08-21)');
  });

  it('writes a formula the way formulas are written everywhere else', () => {
    const content = doc(paragraph({ attrs: { latex: 'e = mc^2' }, type: 'formula' }));

    expect(writePageAsMarkdown(content)).toBe('$e = mc^2$');
  });

  it('fences a callout so it can be told apart from an ordinary quote', () => {
    const content = doc({ attrs: { icon: 'idea' }, content: [paragraph(text('Ojo con esto'))], type: 'callout' });

    expect(writePageAsMarkdown(content)).toBe(':::callout{icon="idea"}\nOjo con esto\n:::');
  });

  it('keeps a toggle folded, with its title where a reader expects it', () => {
    const content = doc({
      attrs: { summary: 'Ver más' },
      content: [paragraph(text('lo de dentro'))],
      type: 'toggle',
    });

    expect(writePageAsMarkdown(content)).toBe(':::toggle{summary="Ver más"}\nlo de dentro\n:::');
  });

  it('names what a block borrowed from elsewhere was, since the text alone would lie about it', () => {
    const content = doc({ attrs: { blockId: 'block-a', pageId: 'page-b', spaceId: 'space-b' }, type: 'synced' });

    expect(writePageAsMarkdown(content)).toBe(':::synced{pageId="page-b" blockId="block-a"}\n:::');
  });

  it('writes underlined, coloured and highlighted words with the tags a reader-back understands', () => {
    const content = doc(
      paragraph(
        { marks: [{ type: 'underline' }], text: 'subrayado', type: 'text' },
        { marks: [{ attrs: { color: 'red' }, type: 'text_color' }, { type: 'strong' }], text: 'rojo', type: 'text' },
        { marks: [{ attrs: { color: 'yellow' }, type: 'background_color' }], text: 'clave', type: 'text' },
      ),
    );

    expect(writePageAsMarkdown(content)).toBe(
      '<u>subrayado</u><span color="red">**rojo**</span><mark color="yellow">clave</mark>',
    );
  });

  it('names a sub-page by its title, a collection by the view it shows, and a link card by its words', () => {
    const content = doc(
      { attrs: { label: 'Runbook', pageId: 'page-a', spaceId: 'space-a' }, type: 'subpage' },
      { attrs: { pageId: 'page-b', spaceId: 'space-a', viewName: 'Tablero' }, type: 'collection' },
      { attrs: { description: 'La guía', title: 'Docs', url: 'https://example.com' }, type: 'bookmark' },
    );

    expect(writePageAsMarkdown(content)).toBe(
      [
        ':::subpage{pageId="page-a" label="Runbook"}\n:::',
        ':::collection{pageId="page-b" viewName="Tablero"}\n:::',
        ':::bookmark{url="https://example.com" title="Docs" description="La guía"}\n:::',
      ].join('\n\n'),
    );
  });

  it('writes columns with what they hold, and the width of a column only when it was given one', () => {
    const content = doc({
      attrs: { id: 'cols' },
      content: [
        { attrs: { id: 'c-1', width: 0.3 }, content: [paragraph(text('Izquierda'))], type: 'column' },
        { attrs: { id: 'c-2' }, content: [paragraph(text('Derecha'))], type: 'column' },
      ],
      type: 'column_list',
    });

    expect(writePageAsMarkdown(content)).toBe(
      ':::column_list\n:::column{width="0.3"}\nIzquierda\n:::\n\n:::column\nDerecha\n:::\n:::',
    );
  });

  it('leaves a block it does not know as itself rather than dropping it', () => {
    const content = doc({ attrs: { flavour: 'nuevo' }, content: [], type: 'someday_block' });

    expect(writePageAsMarkdown(content)).toContain(':::someday_block');
  });
});

const withId = <TNode extends object>(id: string, node: TNode) => ({
  ...node,
  attrs: { ...('attrs' in node && typeof node.attrs === 'object' ? node.attrs : {}), id },
});

describe('writePageAsAnchoredMarkdown — every block says which one it is', () => {
  it('puts each block id right before the block', () => {
    const content = doc(
      withId('b-1', { attrs: { level: 2 }, content: [text('Título')], type: 'heading' }),
      withId('b-2', paragraph(text('Un párrafo'))),
    );

    expect(writePageAsAnchoredMarkdown(content)).toBe(
      '<!-- block:b-1 -->\n## Título\n\n<!-- block:b-2 -->\nUn párrafo',
    );
  });

  it('says in the anchor the colours a whole block is painted with', () => {
    const content = doc({
      attrs: { backgroundColor: 'yellow', id: 'b-1', textColor: 'red' },
      content: [text('Aviso')],
      type: 'paragraph',
    });

    expect(writePageAsAnchoredMarkdown(content)).toBe(
      '<!-- block:b-1 textColor="red" backgroundColor="yellow" -->\nAviso',
    );
  });

  it('names a list item by the item, not by the line inside it', () => {
    const item = (id: string, words: string) =>
      withId(id, { content: [withId(`${id}-line`, paragraph(text(words)))], type: 'list_item' });
    const content = doc(withId('list', { content: [item('i-1', 'uno'), item('i-2', 'dos')], type: 'bullet_list' }));

    expect(writePageAsAnchoredMarkdown(content)).toBe(
      '<!-- block:list -->\n<!-- block:i-1 -->\n- uno\n<!-- block:i-2 -->\n- dos',
    );
  });

  it('leaves the cells of a table unanchored, so the table still reads as one', () => {
    const cell = (words: string) =>
      withId(`c-${words}`, { content: [withId(`p-${words}`, paragraph(text(words)))], type: 'table_cell' });
    const row = (id: string, ...cells: readonly unknown[]) => withId(id, { content: cells, type: 'table_row' });
    const content = doc(
      withId('t', { content: [row('r-1', cell('a'), cell('b')), row('r-2', cell('c'), cell('d'))], type: 'table' }),
    );

    expect(writePageAsAnchoredMarkdown(content)).toBe('<!-- block:t -->\n| a | b |\n| --- | --- |\n| c | d |');
  });

  it('writes a block without an id as it is, since there is nothing to name it by', () => {
    expect(writePageAsAnchoredMarkdown(doc(paragraph(text('Suelto'))))).toBe('Suelto');
  });

  it('writes the plain export without anchors, as always', () => {
    expect(writePageAsMarkdown(doc(withId('b-1', paragraph(text('Hola')))))).toBe('Hola');
  });
});

describe('writePageAsAnchoredMarkdown — what people wrote stays words', () => {
  it('does not let words forge the anchor of another block', () => {
    const written = writePageAsAnchoredMarkdown(doc(paragraph(text('<!-- block:evil -->'))));

    expect(written).not.toContain('\n<!-- block:evil');
    expect(written).toBe(String.raw`\<!-- block:evil -->`);
  });

  it('does not let a block id forge the anchor of another block', () => {
    const forgedId = 'b-1 -->\n# Otro título\n<!-- block:evil';
    const written = writePageAsAnchoredMarkdown(doc(withId(forgedId, paragraph(text('Hola')))));

    expect(written).not.toContain('block:evil');
    expect(written).toBe('Hola');
  });

  it('keeps a quote inside an attribute from closing it', () => {
    const bookmark = { attrs: { title: 't" url="javascript:1}', url: 'https://x.com' }, type: 'bookmark' };

    expect(writePageAsMarkdown(doc(bookmark))).toBe(
      ':::bookmark{url="https://x.com" title="t&quot; url=&quot;javascript:1}"}\n:::',
    );
  });

  it('fences code with more backticks than the code holds, so the code cannot close it', () => {
    const code = {
      attrs: { language: 'markdown' },
      content: [{ text: '```\n:::callout\n**no**', type: 'text' }],
      type: 'code_block',
    };

    expect(writePageAsMarkdown(doc(code))).toBe('````markdown\n```\n:::callout\n**no**\n````');
  });

  it('keeps a bar inside a cell from opening another cell', () => {
    const cell = (value: string) => ({ content: [paragraph(text(value))], type: 'table_cell' });
    const table = { content: [{ content: [cell('a | b')], type: 'table_row' }], type: 'table' };

    expect(writePageAsMarkdown(doc(table))).toBe('| a \\| b |\n| --- |');
  });

  it('keeps a parenthesis inside a link from ending it', () => {
    const linked = text('l', [{ attrs: { href: 'https://a.com/a)b' }, type: 'link' }]);

    expect(writePageAsMarkdown(doc(paragraph(linked)))).toBe('[l](https://a.com/a%29b)');
  });

  it('does not let words start another block', () => {
    expect(writePageAsMarkdown(doc(paragraph(text('# no es un encabezado'))))).toBe(String.raw`\# no es un encabezado`);
    expect(writePageAsMarkdown(doc(paragraph(text('1. no es una lista'))))).toBe(String.raw`1\. no es una lista`);
    expect(writePageAsMarkdown(doc(paragraph(text(':::callout'))))).toBe(String.raw`\:::callout`);
  });

  it('writes words that read back as the same words', () => {
    const words = 'x*y*z [a](b) `c` ~~d~~ $5 \\ <!-- e --> f_g';
    const written = writePageAsMarkdown(doc(paragraph(text(words))));

    expect(readMarkdownInline(written).getValue()).toEqual([{ text: words, type: 'text' }]);
  });
});
