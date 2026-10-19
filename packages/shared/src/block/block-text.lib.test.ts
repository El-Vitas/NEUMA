import { describe, expect, test } from 'bun:test';
import {
  PAGE_TEXT_MARKS_MOST,
  maximumFormulaLatexLength,
  maximumPageContentNodes,
  maximumPageTextLength,
} from '../schemas/page-content.schema.js';
import type { BlockRichText } from './block-content.types.js';
import { blockPlainTextSchema, blockRichTextSchema, blockTextMarksSchema } from './block-text.schemas.js';
import { extractPlainText } from './block-text.lib.js';

const USER_ID = '0192f3a0-7c1e-7d2a-9b4e-3f5a6b7c8d9e';
const LONG_LABEL = 'a'.repeat(201);

describe('blockRichTextSchema', () => {
  test('accepts every mark', () => {
    const richText = [
      { attributes: { strong: true, em: true, strike: true, underline: true, code: true }, insert: 'marked' },
      { attributes: { link: 'https://example.com/a' }, insert: 'link' },
      { attributes: { text_color: 'red', background_color: 'blue' }, insert: 'colors' },
      { attributes: { comment: 'comment-1' }, insert: 'commented' },
    ];

    expect(blockRichTextSchema.safeParse(richText).success).toBe(true);
  });

  test('accepts every inline embed', () => {
    const richText = [
      { insert: { mention: { label: 'Plan', pageId: 'p1', spaceId: 's1' } } },
      { insert: { person: { label: 'Ana', userId: USER_ID } } },
      { insert: { date: { at: '2026-10-19' } } },
      { insert: { formula: { latex: 'x^2' } } },
      { insert: { hard_break: true } },
    ];

    expect(blockRichTextSchema.safeParse(richText).success).toBe(true);
  });

  test('accepts an empty text', () => {
    expect(blockRichTextSchema.safeParse([]).success).toBe(true);
  });

  test('rejects a mark it does not know and a mark without its value', () => {
    expect(blockTextMarksSchema.safeParse({ highlight: true }).success).toBe(false);
    expect(blockTextMarksSchema.safeParse({ strong: false }).success).toBe(false);
    expect(blockTextMarksSchema.safeParse({ text_color: 'pink' }).success).toBe(false);
  });

  test('rejects a link that leaves the allowed protocols or the app', () => {
    expect(blockTextMarksSchema.safeParse({ link: 'javascript:alert(1)' }).success).toBe(false);
    expect(blockTextMarksSchema.safeParse({ link: '//evil.site' }).success).toBe(false);
    expect(blockTextMarksSchema.safeParse({ link: '/spaces/a/pages/b' }).success).toBe(true);
  });

  test('rejects more marks than one text may carry', () => {
    const marks = { code: true, em: true, strike: true, strong: true, underline: true, link: '/a' };

    expect(Object.keys(marks).length).toBeGreaterThan(PAGE_TEXT_MARKS_MOST);
    expect(blockTextMarksSchema.safeParse(marks).success).toBe(false);
  });

  test('rejects a text over the limit, an empty text and a text that holds tags', () => {
    expect(blockRichTextSchema.safeParse([{ insert: 'a'.repeat(maximumPageTextLength + 1) }]).success).toBe(false);
    expect(blockRichTextSchema.safeParse([{ insert: '' }]).success).toBe(false);
    expect(blockRichTextSchema.safeParse([{ insert: 'before <script>x</script>' }]).success).toBe(false);
  });

  test('rejects embeds that break today limits', () => {
    const invalidEmbeds = [
      { mention: { label: LONG_LABEL, pageId: 'p1', spaceId: 's1' } },
      { person: { label: 'Ana', userId: 'not-a-uuid' } },
      { date: { at: '2026-02-30' } },
      { formula: { latex: 'x'.repeat(maximumFormulaLatexLength + 1) } },
      { hard_break: false },
      { unknown: { value: 1 } },
    ];

    for (const insert of invalidEmbeds) {
      expect(blockRichTextSchema.safeParse([{ insert }]).success).toBe(false);
    }
  });

  test('rejects marks on an embed and unknown keys on a segment', () => {
    expect(
      blockRichTextSchema.safeParse([{ attributes: { strong: true }, insert: { hard_break: true } }]).success,
    ).toBe(false);
    expect(blockRichTextSchema.safeParse([{ extra: 1, insert: 'a' }]).success).toBe(false);
  });

  test('rejects more segments than a page can hold', () => {
    const richText = Array.from({ length: maximumPageContentNodes + 1 }, () => ({ insert: 'a' }));

    expect(blockRichTextSchema.safeParse(richText).success).toBe(false);
  });
});

describe('blockPlainTextSchema', () => {
  test('takes plain segments and refuses marks and embeds', () => {
    expect(blockPlainTextSchema.safeParse([{ insert: '<div>kept as code</div>' }]).success).toBe(true);
    expect(blockPlainTextSchema.safeParse([{ attributes: { strong: true }, insert: 'a' }]).success).toBe(false);
    expect(blockPlainTextSchema.safeParse([{ insert: { hard_break: true } }]).success).toBe(false);
  });
});

describe('extractPlainText', () => {
  test('joins text and ignores marks', () => {
    const richText = [{ insert: 'one ' }, { attributes: { strong: true }, insert: 'two' }];

    expect(extractPlainText(richText)).toBe('one two');
  });

  test('reads a mention and a person as their label and a date as its day, as the page search does', () => {
    const richText = [
      { insert: { mention: { label: 'Plan', pageId: 'p1', spaceId: 's1' } } },
      { insert: ' ' },
      { insert: { person: { label: 'Ana', userId: USER_ID } } },
      { insert: ' ' },
      { insert: { date: { at: '2026-10-19' } } },
    ];

    expect(extractPlainText(richText)).toBe('Plan Ana 2026-10-19');
  });

  test('reads a hard break as a space and a formula as nothing', () => {
    const richText: BlockRichText = [
      { insert: 'a' },
      { insert: { hard_break: true } },
      { insert: 'b' },
      { insert: { formula: { latex: 'x^2' } } },
    ];

    expect(extractPlainText(richText)).toBe('a b');
  });

  test('gives an empty string for an empty text', () => {
    expect(extractPlainText([])).toBe('');
  });
});
