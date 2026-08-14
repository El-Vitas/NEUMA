import { describe, expect, it } from 'bun:test';
import { readLinkPreviewFromHtml } from '@/modules/pages/lib/pages.link-preview.lib';

const pageSaying = (head: string): string => `<!doctype html><html><head>${head}</head><body>x</body></html>`;

describe('what a page says about itself', () => {
  it('prefers what the site wrote for whoever shares it', () => {
    const html = pageSaying(`
      <title>El título de la pestaña</title>
      <meta property="og:title" content="El título compartido" />
      <meta property="og:description" content="De qué trata" />
      <link rel="icon" href="/favicon.png" />
    `);

    expect(readLinkPreviewFromHtml(html, 'https://example.com/a/b')).toEqual({
      icon: 'https://example.com/favicon.png',
      title: 'El título compartido',
      url: 'https://example.com/a/b',
    });
  });

  /** What a site tells a stranger about itself is often about something else; only its name is taken. */
  it('takes the name and the mark, and nothing a site says about itself', () => {
    const html = pageSaying(`
      <title>Un video</title>
      <meta name="description" content="La descripcion de otro video" />
    `);

    expect(readLinkPreviewFromHtml(html, 'https://example.com/a')).toEqual({
      title: 'Un video',
      url: 'https://example.com/a',
    });
  });

  it('falls back to the title of the page, and to nothing rather than something invented', () => {
    expect(readLinkPreviewFromHtml(pageSaying('<title>Solo un título</title>'), 'https://example.com/a')).toEqual({
      title: 'Solo un título',
      url: 'https://example.com/a',
    });
    expect(readLinkPreviewFromHtml(pageSaying(''), 'https://example.com/a')).toEqual({ url: 'https://example.com/a' });
  });

  /** A mark given as a whole address is kept as it is; one given as a path is read against the link. */
  it('reads the mark of the site wherever it is given', () => {
    const absolute = pageSaying('<link rel="shortcut icon" href="https://cdn.example.com/i.png" />');
    expect(readLinkPreviewFromHtml(absolute, 'https://example.com/a')?.icon).toBe('https://cdn.example.com/i.png');
  });

  it('says nothing about what is not a page at all', () => {
    expect(readLinkPreviewFromHtml('no soy html', 'https://example.com/a')).toEqual({ url: 'https://example.com/a' });
  });
});
