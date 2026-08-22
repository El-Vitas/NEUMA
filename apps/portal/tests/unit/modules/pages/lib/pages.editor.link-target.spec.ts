import { describe, expect, it } from 'bun:test';
import { DOMSerializer } from 'prosemirror-model';
import { isPageEditorLinkTarget, pageEditorSchema } from '@/modules/pages/lib/pages.editor.schema';

const drawLink = (href: string): string => {
  const mark = pageEditorSchema.marks.link.create({ href });
  const text = pageEditorSchema.text('ver', [mark]);
  const fragment = DOMSerializer.fromSchema(pageEditorSchema).serializeFragment(
    pageEditorSchema.nodes.paragraph.create(null, text).content,
  );
  const holder = document.createElement('div');
  holder.append(fragment);
  return holder.innerHTML;
};

describe('isPageEditorLinkTarget', () => {
  it('accepts the places a link is meant to reach', () => {
    expect(isPageEditorLinkTarget('https://ejemplo.com')).toBe(true);
    expect(isPageEditorLinkTarget('mailto:ana@ejemplo.com')).toBe(true);
    expect(isPageEditorLinkTarget('/spaces/space-a/pages/page-a')).toBe(true);
  });

  it('refuses a destination that runs code instead of going somewhere', () => {
    expect(isPageEditorLinkTarget('javascript:alert(1)')).toBe(false);
    expect(isPageEditorLinkTarget('  javascript:alert(1)')).toBe(false);
    expect(isPageEditorLinkTarget('data:text/html,<script>alert(1)</script>')).toBe(false);
  });
});

describe('drawing a link somebody else wrote', () => {
  it('draws an ordinary destination as a link', () => {
    expect(drawLink('https://ejemplo.com')).toContain('href="https://ejemplo.com"');
  });

  /**
   * A page is written by several people at once, and what arrives over the
   * live connection has not passed through the stored schema. The drawing is
   * the last place left to refuse.
   */
  it('draws a destination that runs code as plain writing, keeping the text and dropping the link', () => {
    const drawn = drawLink('javascript:alert(1)');

    expect(drawn).not.toContain('javascript:');
    expect(drawn).not.toContain('<a');
    expect(drawn).toContain('ver');
  });
});
