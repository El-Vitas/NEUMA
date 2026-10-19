import { describe, expect, test } from 'bun:test';
import { PAGE_DOCUMENT_MARKS } from '../page-document/page-document.structure.js';
import { text } from './block-document.fixtures.js';
import {
  CANONICAL_MARK_ORDER,
  inlineNodesToRichText,
  plainTextToTextNodes,
  richTextToInlineNodes,
  textNodesToPlainText,
} from './block-document.text.lib.js';

describe('inlineNodesToRichText', () => {
  test('turns marks into attributes, one key per mark', () => {
    const result = inlineNodesToRichText([
      text('plain'),
      text('both', [{ type: 'strong' }, { attrs: { href: 'https://example.com' }, type: 'link' }]),
      text('colors', [
        { attrs: { color: 'red' }, type: 'text_color' },
        { attrs: { color: 'blue' }, type: 'background_color' },
        { attrs: { id: 'c-1' }, type: 'comment' },
      ]),
    ]);

    expect(result.getValue()).toEqual([
      { insert: 'plain' },
      { attributes: { link: 'https://example.com', strong: true }, insert: 'both' },
      { attributes: { background_color: 'blue', comment: 'c-1', text_color: 'red' }, insert: 'colors' },
    ]);
  });

  test('turns inline nodes into embeds', () => {
    const result = inlineNodesToRichText([
      { attrs: { label: 'Roadmap', pageId: 'p', spaceId: 's' }, type: 'mention' },
      { attrs: { at: '2026-10-19' }, type: 'date' },
      { attrs: { latex: 'x' }, type: 'formula' },
      { type: 'hard_break' },
    ]);

    expect(result.getValue()).toEqual([
      { insert: { mention: { label: 'Roadmap', pageId: 'p', spaceId: 's' } } },
      { insert: { date: { at: '2026-10-19' } } },
      { insert: { formula: { latex: 'x' } } },
      { insert: { hard_break: true } },
    ]);
  });

  test('refuses two marks of one kind on one text, which attributes cannot hold', () => {
    const result = inlineNodesToRichText([
      text('x', [
        { attrs: { href: 'https://a.example' }, type: 'link' },
        { attrs: { href: 'https://b.example' }, type: 'link' },
      ]),
    ]);

    expect(result.isFail()).toBe(true);
  });

  test('refuses a node that is not inline', () => {
    expect(inlineNodesToRichText([{ type: 'paragraph' }]).isFail()).toBe(true);
  });
});

describe('richTextToInlineNodes', () => {
  test('writes marks in the order the editor writes them, whatever the attribute order', () => {
    const nodes = richTextToInlineNodes([
      {
        attributes: { underline: true, text_color: 'red', strong: true, link: 'https://example.com', code: true },
        insert: 'x',
      },
    ]);

    expect(nodes).toEqual([
      {
        marks: [
          { type: 'code' },
          { attrs: { href: 'https://example.com' }, type: 'link' },
          { type: 'strong' },
          { attrs: { color: 'red' }, type: 'text_color' },
          { type: 'underline' },
        ],
        text: 'x',
        type: 'text',
      },
    ]);
  });

  test('leaves out marks when a text has none', () => {
    expect(richTextToInlineNodes([{ insert: 'a' }, { attributes: {}, insert: 'b' }])).toEqual([
      { text: 'a', type: 'text' },
      { text: 'b', type: 'text' },
    ]);
  });

  test('turns every embed back into its node', () => {
    const nodes = richTextToInlineNodes([
      { insert: { person: { label: 'Ana', userId: '0192f3a0-7c1e-7d2a-9b4e-3f5a6b7c8d9e' } } },
      { insert: { hard_break: true } },
    ]);

    expect(nodes).toEqual([
      { attrs: { label: 'Ana', userId: '0192f3a0-7c1e-7d2a-9b4e-3f5a6b7c8d9e' }, type: 'person' },
      { type: 'hard_break' },
    ]);
  });

  test('the canonical order is the mark order of the page document', () => {
    expect(CANONICAL_MARK_ORDER).toEqual(Object.keys(PAGE_DOCUMENT_MARKS));
  });
});

describe('plain text', () => {
  test('code text nodes become plain segments and back', () => {
    const plain = textNodesToPlainText([text('a <b> c'), text('d')]);

    expect(plain.getValue()).toEqual([{ insert: 'a <b> c' }, { insert: 'd' }]);
    expect(plainTextToTextNodes(plain.getValue())).toEqual([
      { text: 'a <b> c', type: 'text' },
      { text: 'd', type: 'text' },
    ]);
  });

  test('refuses marks, which code text cannot carry', () => {
    expect(textNodesToPlainText([text('x', [{ type: 'strong' }])]).isFail()).toBe(true);
  });
});
