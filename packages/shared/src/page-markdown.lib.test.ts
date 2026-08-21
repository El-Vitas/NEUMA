import { describe, expect, it } from 'bun:test';
import { writePageAsMarkdown } from './page-markdown.lib.js';
import type { PageContent } from './schemas/page-content.schema.js';

const doc = (...content: readonly unknown[]): PageContent =>
  ({ content, schemaVersion: 1, type: 'doc' }) as unknown as PageContent;

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
      paragraph(
        text('normal '),
        text('fuerte', [{ type: 'bold' }]),
        text(' y '),
        text('torcido', [{ type: 'italic' }]),
      ),
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
    const content = doc({ attrs: { language: 'ts' }, content: [text('const x = 1;')], type: 'code_block' });

    expect(writePageAsMarkdown(content)).toBe('```ts\nconst x = 1;\n```');
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
    const content = doc(paragraph({ attrs: { label: 'Ana', userId: 'user-a' }, type: 'person' }));

    expect(writePageAsMarkdown(content)).toBe('[@Ana](person:user-a)');
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
    const content = doc({ attrs: { icon: '💡' }, content: [paragraph(text('Ojo con esto'))], type: 'callout' });

    expect(writePageAsMarkdown(content)).toBe(':::callout{icon="💡"}\nOjo con esto\n:::');
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
    const content = doc({ attrs: { blockId: 'block-a', pageId: 'page-b' }, content: [], type: 'synced' });

    expect(writePageAsMarkdown(content)).toBe(':::synced{pageId="page-b" blockId="block-a"}\n:::');
  });

  it('leaves a block it does not know as itself rather than dropping it', () => {
    const content = doc({ attrs: { flavour: 'nuevo' }, content: [], type: 'someday_block' });

    expect(writePageAsMarkdown(content)).toContain(':::someday_block');
  });
});
