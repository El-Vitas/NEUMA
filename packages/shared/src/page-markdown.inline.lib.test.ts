import { describe, expect, it } from 'bun:test';
import { readMarkdownInline } from './page-markdown.inline.lib.js';

const SPACE = '22222222-2222-4222-8222-222222222222';
const PAGE = 'a1111111-1111-4111-8111-111111111111';
const PERSON = '0192f3a4-5b6c-7d8e-9f01-23456789abcd';

describe('readMarkdownInline — words and marks', () => {
  it('reads plain words as one text', () => {
    expect(readMarkdownInline('Hola mundo').getValue()).toEqual([{ text: 'Hola mundo', type: 'text' }]);
  });

  it('reads bold, italic, code and strikethrough as the marks the page stores', () => {
    expect(readMarkdownInline('**a** *b* `c` ~~d~~').getValue()).toEqual([
      { marks: [{ type: 'strong' }], text: 'a', type: 'text' },
      { text: ' ', type: 'text' },
      { marks: [{ type: 'em' }], text: 'b', type: 'text' },
      { text: ' ', type: 'text' },
      { marks: [{ type: 'code' }], text: 'c', type: 'text' },
      { text: ' ', type: 'text' },
      { marks: [{ type: 'strike' }], text: 'd', type: 'text' },
    ]);
  });

  it('carries the outer mark into what is nested inside it', () => {
    expect(readMarkdownInline('**negrita *y cursiva***').getValue()).toEqual([
      { marks: [{ type: 'strong' }], text: 'negrita ', type: 'text' },
      { marks: [{ type: 'strong' }, { type: 'em' }], text: 'y cursiva', type: 'text' },
    ]);
  });

  it('keeps what is inside code as it is written, marks included', () => {
    expect(readMarkdownInline('`**no**`').getValue()).toEqual([
      { marks: [{ type: 'code' }], text: '**no**', type: 'text' },
    ]);
  });

  it('leaves a marker nobody closed as a plain character, and an escaped one too', () => {
    expect(readMarkdownInline('2 * 3 = 6 y \\*no\\*').getValue()).toEqual([{ text: '2 * 3 = 6 y *no*', type: 'text' }]);
  });

  it('breaks the line where the text breaks it, inside the same block', () => {
    expect(readMarkdownInline('uno\ndos').getValue()).toEqual([
      { text: 'uno', type: 'text' },
      { type: 'hard_break' },
      { text: 'dos', type: 'text' },
    ]);
  });
});

describe('readMarkdownInline — formulas', () => {
  it('reads a formula between dollar signs, as the page writes it', () => {
    expect(readMarkdownInline('Energía: $E = mc^2$.').getValue()).toEqual([
      { text: 'Energía: ', type: 'text' },
      { attrs: { latex: 'E = mc^2' }, type: 'formula' },
      { text: '.', type: 'text' },
    ]);
  });

  /** Un precio no es una fórmula: «$5 y $10» se queda como se escribió. */
  it('leaves amounts of money as words', () => {
    expect(readMarkdownInline('Cuesta $5 y $10 en total').getValue()).toEqual([
      { text: 'Cuesta $5 y $10 en total', type: 'text' },
    ]);
  });
});

describe('readMarkdownInline — links, and what a link can stand for', () => {
  it('reads a web link as a link on its words', () => {
    expect(readMarkdownInline('ver [la guía](https://example.com/guia)').getValue()).toEqual([
      { text: 'ver ', type: 'text' },
      { marks: [{ attrs: { href: 'https://example.com/guia' }, type: 'link' }], text: 'la guía', type: 'text' },
    ]);
  });

  it('reads a link to a Company Brain page as a mention of it, from its path or from a full portal link', () => {
    const mention = { attrs: { label: 'Runbook', pageId: PAGE, spaceId: SPACE }, type: 'mention' } as const;

    expect(readMarkdownInline(`[Runbook](/spaces/${SPACE}/pages/${PAGE})`).getValue()).toEqual([mention]);
    expect(readMarkdownInline(`[Runbook](http://localhost:3010/es/spaces/${SPACE}/pages/${PAGE})`).getValue()).toEqual([
      mention,
    ]);
  });

  it('reads a person and a date as the page writes them', () => {
    expect(readMarkdownInline(`[@Ana Pérez](person:${PERSON}) el [2026-10-15](date:2026-10-15)`).getValue()).toEqual([
      { attrs: { label: 'Ana Pérez', userId: PERSON }, type: 'person' },
      { text: ' el ', type: 'text' },
      { attrs: { at: '2026-10-15' }, type: 'date' },
    ]);
  });

  it('refuses a link the page would not keep, saying why', () => {
    expect(readMarkdownInline('[x](javascript:alert(1))').getError()).toContain('javascript:alert(1)');
    expect(readMarkdownInline('[x](date:2026-02-30)').getError()).toContain('2026-02-30');
  });
});

describe('readMarkdownInline — what the page paints that Markdown has no sign for', () => {
  it('reads underlined, coloured and highlighted words, together with the marks inside them', () => {
    expect(
      readMarkdownInline(
        '<u>subrayado</u> <span color="red">**rojo**</span> <mark color="yellow">clave</mark>',
      ).getValue(),
    ).toEqual([
      { marks: [{ type: 'underline' }], text: 'subrayado', type: 'text' },
      { text: ' ', type: 'text' },
      { marks: [{ attrs: { color: 'red' }, type: 'text_color' }, { type: 'strong' }], text: 'rojo', type: 'text' },
      { text: ' ', type: 'text' },
      { marks: [{ attrs: { color: 'yellow' }, type: 'background_color' }], text: 'clave', type: 'text' },
    ]);
  });

  it('refuses a colour the page does not have, naming the ones it does', () => {
    expect(readMarkdownInline('<span color="pink">x</span>').getError()).toContain('gray, brown, orange');
  });

  it('leaves as writing a tag it does not know, or one never closed', () => {
    expect(readMarkdownInline('a <b>b</b> <u>c').getValue()).toEqual([{ text: 'a <b>b</b> <u>c', type: 'text' }]);
  });
});
