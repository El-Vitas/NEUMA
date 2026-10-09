import { describe, expect, it } from 'bun:test';
import { readMarkdownInline, readPageLinkAddress } from './page-markdown.inline.lib.js';
import { pageContentSchema } from './schemas/page-content.schema.js';

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

  /** Dos barras son una barra escrita: el signo que sigue vuelve a contar. */
  it('reads a written backslash before a marker as a backslash, and the marker as a marker', () => {
    expect(readMarkdownInline(String.raw`\\*a*`).getValue()).toEqual([
      { text: '\\', type: 'text' },
      { marks: [{ type: 'em' }], text: 'a', type: 'text' },
    ]);
  });

  it('leaves a marker nobody closed as a plain character, and an escaped one too', () => {
    expect(readMarkdownInline(String.raw`2 * 3 = 6 y \*no\*`).getValue()).toEqual([
      { text: '2 * 3 = 6 y *no*', type: 'text' },
    ]);
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

  /** Dos barras al principio llevan a otro sitio aunque parezcan un camino de la aplicación. */
  it('refuses a link that starts with two slashes, which leads to another site', () => {
    expect(readMarkdownInline('[x](//evil.example/a)').isFail()).toBe(true);
  });
});

describe('readPageLinkAddress', () => {
  it('reads the page a link leads to, with or without domain and language in front', () => {
    expect(readPageLinkAddress('/spaces/s1/pages/p1')).toEqual({ pageId: 'p1', spaceId: 's1' });
    expect(readPageLinkAddress('https://brain.example/es/spaces/s1/pages/p1#block')).toEqual({
      pageId: 'p1',
      spaceId: 's1',
    });
  });

  it('reads nothing from a link that leads elsewhere', () => {
    expect(readPageLinkAddress('https://example.com/docs')).toBeNull();
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

  /** La página nunca guarda una etiqueta como texto: se dice cuál y qué hacer, en vez de un fallo sin explicación al guardar. */
  it('refuses a tag it does not know, or one never closed, naming it', () => {
    expect(readMarkdownInline('a <b>b</b>').getError()).toContain('"<b>" is an HTML tag');
    expect(readMarkdownInline('a <u>c').getError()).toContain('"<u>" is an HTML tag');
  });

  /** Una etiqueta igual dentro de otra se cortaría mal y perdería su color: se dice, en vez de guardarla rota. */
  it('refuses a tag inside another of the same name, saying how to write it', () => {
    const nested = '<span color="red">a <span color="blue">b</span> c</span>';

    expect(readMarkdownInline(nested).getError()).toContain('close the first one');
  });

  it('refuses more styles on the same words than a page keeps', () => {
    const crowded = '<u><span color="red"><mark color="blue">**a *b ~~c `d`~~***</mark></span></u>';

    expect(readMarkdownInline(crowded).getError()).toContain('more than 5 styles');
  });

  /** Lo que el lector entrega se puede guardar tal cual: si no, el rechazo llegaría después y sin decir por qué. */
  it('gives back only words a page keeps', () => {
    const read = readMarkdownInline('**a** <u>b</u> [c](https://example.com) a < b > c').getValue();

    expect(
      pageContentSchema.safeParse({ content: [{ content: read, type: 'paragraph' }], schemaVersion: 1, type: 'doc' })
        .success,
    ).toBe(true);
  });
});

/**
 * Un texto escrito para trabar la lectura no la traba: cada signo que no
 * cierra se busca una vez, no una vez por cada signo igual que lo sigue.
 */
describe('readMarkdownInline — text written to slow the reading down', () => {
  const LONGEST_TEXT = 20_000;
  const QUICK_MS = 100;

  const timeReading = (source: string): number => {
    const startedAt = performance.now();
    readMarkdownInline(source);
    return performance.now() - startedAt;
  };

  it.each([
    ['brackets that never close', '['.repeat(LONGEST_TEXT)],
    ['links that never get their address', '[a]('.repeat(LONGEST_TEXT / 4)],
    ['signs of bold that never close', '*'.repeat(LONGEST_TEXT)],
    ['signs of a formula that never close', '$a'.repeat(LONGEST_TEXT / 2)],
    ['tags that never close', '<u>'.repeat(LONGEST_TEXT / 3)],
    ['tags written one after another', '<'.repeat(LONGEST_TEXT)],
    ['a long run of backslashes', '\\'.repeat(LONGEST_TEXT)],
    ['backslashes before every bracket', String.raw`\[`.repeat(LONGEST_TEXT / 2)],
  ])('reads %s at once', (_case, source) => {
    expect(timeReading(source)).toBeLessThan(QUICK_MS);
  });

  /** Mil enlaces uno dentro de otro no agotan la pila: se dice que es demasiado. */
  it('refuses links nested too deep instead of failing on its own', () => {
    const nested = `${'['.repeat(5000)}x${'](https://a.example)'.repeat(5000)}`;

    expect(readMarkdownInline(nested).isFail()).toBe(true);
  });

  it('still reads a link inside another link and marks inside marks', () => {
    expect(readMarkdownInline('[**[x](https://a.example)**](https://b.example)').isOk()).toBe(true);
  });
});
