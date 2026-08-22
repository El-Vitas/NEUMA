import { describe, expect, it } from 'bun:test';
import { pageEditorSchema } from '@/modules/pages/editor/lib/pages.editor.schema';
import {
  looksLikePageEditorMarkdown,
  parsePageEditorMarkdown,
} from '@/modules/pages/editor/text/lib/pages.editor.markdown.lib';

const parse = (text: string) => parsePageEditorMarkdown(pageEditorSchema, text).map((block) => block.toJSON());

describe('telling Markdown apart from a plain run of writing', () => {
  it('reads a heading, a list, a quote, a fence and a divider as Markdown', () => {
    expect(looksLikePageEditorMarkdown('# Title')).toBe(true);
    expect(looksLikePageEditorMarkdown('- one')).toBe(true);
    expect(looksLikePageEditorMarkdown('1. one')).toBe(true);
    expect(looksLikePageEditorMarkdown('[ ] pending')).toBe(true);
    expect(looksLikePageEditorMarkdown('> said')).toBe(true);
    expect(looksLikePageEditorMarkdown('```js')).toBe(true);
    expect(looksLikePageEditorMarkdown('a paragraph\n---')).toBe(true);
  });

  it('leaves an ordinary sentence as writing, not as Markdown', () => {
    expect(looksLikePageEditorMarkdown('Just a sentence about a plan, nothing more.')).toBe(false);
    expect(looksLikePageEditorMarkdown('')).toBe(false);
  });
});

describe('reading blocks out of pasted Markdown', () => {
  it('turns #, ## and ### into headings of the matching level', () => {
    const [level1, level2, level3] = parse('# One\n## Two\n### Three');

    expect(level1).toMatchObject({ attrs: { level: 1 }, type: 'heading' });
    expect(level2).toMatchObject({ attrs: { level: 2 }, type: 'heading' });
    expect(level3).toMatchObject({ attrs: { level: 3 }, type: 'heading' });
    expect(level1?.content).toEqual([{ text: 'One', type: 'text' }]);
  });

  it('turns -, * and + into one bullet list of list items', () => {
    const [list] = parse('- first\n* second\n+ third');

    expect(list?.type).toBe('bullet_list');
    expect(list?.content).toHaveLength(3);
    expect(list?.content?.[0]).toMatchObject({ type: 'list_item' });
  });

  it('turns 1. lines into an ordered list carrying the first number written', () => {
    const [list] = parse('5. first\n6. second');

    expect(list).toMatchObject({ attrs: { order: 5 }, type: 'ordered_list' });
    expect(list?.content).toHaveLength(2);
  });

  it('turns [ ] and [x] into a task list with the matching checked state', () => {
    const [list] = parse('[ ] pending\n[x] done\n[X] also done');

    expect(list?.type).toBe('task_list');
    expect(list?.content?.map((item: { attrs?: { checked?: boolean } }) => item.attrs?.checked)).toEqual([
      false,
      true,
      true,
    ]);
  });

  it('turns consecutive > lines into one blockquote, one paragraph per line', () => {
    const [quote] = parse('> first\n> second');

    expect(quote?.type).toBe('blockquote');
    expect(quote?.content).toHaveLength(2);
  });

  it('turns a fenced block into a code_block, keeping the language and the body untouched', () => {
    const [block] = parse('```javascript\nconst x = 1;\nconst y = 2;\n```');

    expect(block).toMatchObject({ attrs: { language: 'javascript' }, type: 'code_block' });
    expect(block?.content).toEqual([{ text: 'const x = 1;\nconst y = 2;', type: 'text' }]);
  });

  it('drops the language when it is not one this page knows, keeping the code itself', () => {
    const [block] = parse('```not-a-real-language\ncode\n```');

    expect(block).toMatchObject({ attrs: { language: null }, type: 'code_block' });
  });

  it('reads --- on its own line as a divider', () => {
    const [divider] = parse('---');

    expect(divider?.type).toBe('divider');
  });

  it('reads inline **bold**, *italic*, `code`, ~~strike~~ and [text](url) inside a paragraph', () => {
    const [paragraph] = parse('a **bold** and *italic* and `code` and ~~gone~~ and [a link](https://example.com/a)');

    expect(paragraph?.type).toBe('paragraph');
    expect(paragraph?.content).toEqual([
      { text: 'a ', type: 'text' },
      { marks: [{ type: 'strong' }], text: 'bold', type: 'text' },
      { text: ' and ', type: 'text' },
      { marks: [{ type: 'em' }], text: 'italic', type: 'text' },
      { text: ' and ', type: 'text' },
      { marks: [{ type: 'code' }], text: 'code', type: 'text' },
      { text: ' and ', type: 'text' },
      { marks: [{ type: 'strike' }], text: 'gone', type: 'text' },
      { text: ' and ', type: 'text' },
      { marks: [{ attrs: { href: 'https://example.com/a' }, type: 'link' }], text: 'a link', type: 'text' },
    ]);
  });

  it('joins consecutive plain lines into a single paragraph, the way a paragraph is read', () => {
    const [paragraph] = parse('first line\nsecond line');

    expect(paragraph?.type).toBe('paragraph');
    expect(paragraph?.content).toEqual([{ text: 'first line second line', type: 'text' }]);
  });

  it('reads a whole document made of every kind of block, in the order it was written', () => {
    const blocks = parse('# Title\n\nSome writing.\n\n- one\n- two\n\n> quoted\n\n---');

    expect(blocks.map((block) => block.type)).toEqual(['heading', 'paragraph', 'bullet_list', 'blockquote', 'divider']);
  });
});
