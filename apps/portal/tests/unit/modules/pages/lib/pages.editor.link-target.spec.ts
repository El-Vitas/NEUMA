import { describe, expect, it } from 'bun:test';
import { DOMParser, DOMSerializer } from 'prosemirror-model';
import { pageEditorSchema } from '@/modules/pages/editor/lib/pages.editor.schema';
import { createPageBookmarkNodeView } from '@/modules/pages/editor/media/lib/pages.editor.bookmark.node-view.lib';

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

describe('a link kept as a card', () => {
  const cardFrom = (href: string) => {
    const holder = document.createElement('div');
    holder.innerHTML = `<a data-page-bookmark="true" href="${href}">ver</a>`;
    return DOMParser.fromSchema(pageEditorSchema).parse(holder).firstChild;
  };

  const drawCard = (url: string): string => {
    const card = pageEditorSchema.nodes.bookmark.create({ url });
    const holder = document.createElement('div');
    holder.append(DOMSerializer.fromSchema(pageEditorSchema).serializeNode(card));
    return holder.innerHTML;
  };

  it('keeps a card that leads to a web address', () => {
    expect(cardFrom('https://ejemplo.com')?.type.name).toBe('bookmark');
    expect(drawCard('https://ejemplo.com')).toContain('href="https://ejemplo.com"');
  });

  /** Una tarjeta se abre con un clic: una que corre código no se pega ni se dibuja como enlace. */
  it('neither takes nor draws a card that runs code when it is opened', () => {
    expect(cardFrom('javascript:alert(1)')?.type.name).not.toBe('bookmark');
    expect(drawCard('javascript:alert(1)')).not.toContain('javascript:');
  });

  it('opens nothing from a card that arrived over the live connection pointing at code', () => {
    const card = pageEditorSchema.nodes.bookmark.create({ url: 'javascript:alert(1)' });

    const view = createPageBookmarkNodeView(card);

    expect(view.dom).toBeInstanceOf(HTMLElement);
    expect((view.dom as HTMLElement).getAttribute('href')).toBeNull();
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

  /** Dos barras, o una barra con un tab en medio, llevan a otro sitio aunque parezcan un camino propio. */
  it('draws as plain writing what looks like a path of this product and leads to another site', () => {
    expect(drawLink('//evil.example')).not.toContain('<a');
    expect(drawLink('/\t/evil.example')).not.toContain('<a');
    expect(drawLink('/spaces/a/pages/b')).toContain('href="/spaces/a/pages/b"');
  });
});
