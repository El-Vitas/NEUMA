import { describe, expect, it } from 'bun:test';
import { type PageForExport, writePageAsMarkdownFile, writePagesAsMarkdownFiles } from './page-export.lib.js';
import type { PageContent } from './schemas/page-content.schema.js';

const saying = (words: string): PageContent =>
  ({
    content: [{ content: [{ text: words, type: 'text' }], type: 'paragraph' }],
    schemaVersion: 1,
    type: 'doc',
  }) as unknown as PageContent;

let nextId = 0;
const page = (title: string, words: string, above: readonly string[] = []): PageForExport => {
  nextId += 1;
  return { content: saying(words), id: `page-${String(nextId)}`, path: above, title };
};

describe('writePageAsMarkdownFile', () => {
  it('opens the file with the name of the page', () => {
    expect(writePageAsMarkdownFile(page('Manual', 'Lo que dice'))).toBe('# Manual\n\nLo que dice');
  });

  it('calls a page with no name by the name it is read as everywhere else', () => {
    expect(writePageAsMarkdownFile(page('', 'algo'), 'Sin título')).toContain('# Sin título');
  });
});

describe('writePagesAsMarkdownFiles', () => {
  it('gives every page its own file', () => {
    const files = writePagesAsMarkdownFiles([page('Primera', 'uno'), page('Segunda', 'dos')]);

    expect(files.map((file) => file.path)).toEqual(['Primera.md', 'Segunda.md']);
  });

  /** A page with pages under it is both the file that holds its writing and the folder that holds its daughters. */
  it('puts a daughter inside a folder named after her mother', () => {
    const files = writePagesAsMarkdownFiles([
      page('Madre', 'arriba'),
      page('Hija', 'medio', ['Madre']),
      page('Nieta', 'abajo', ['Madre', 'Hija']),
    ]);

    expect(files.map((file) => file.path)).toEqual(['Madre.md', 'Madre/Hija.md', 'Madre/Hija/Nieta.md']);
  });

  /** A slash in a title would quietly turn one page into a folder somebody never made. */
  it('takes out what would break a path, and nothing else', () => {
    const files = writePagesAsMarkdownFiles([page('Ventas / Chile: 2026', 'x')]);

    expect(files[0]?.path).toBe('Ventas Chile 2026.md');
  });

  it('lets a page keep its accents and its spaces, because a file name carries them fine', () => {
    const files = writePagesAsMarkdownFiles([page('Diseño y año', 'x')]);

    expect(files[0]?.path).toBe('Diseño y año.md');
  });

  /** Some systems refuse a name that ends in a dot or a space outright. */
  it('does not leave a name ending where a file system would refuse it', () => {
    const files = writePagesAsMarkdownFiles([page('Borrador...', 'x')]);

    expect(files[0]?.path).toBe('Borrador.md');
  });

  /** Two sisters called the same thing would land on the same file and one would win. */
  it('gives the second of two sisters with one name a file of her own', () => {
    const files = writePagesAsMarkdownFiles([page('Acta', 'una'), page('Acta', 'otra'), page('Acta', 'tercera')]);

    expect(files.map((file) => file.path)).toEqual(['Acta.md', 'Acta (2).md', 'Acta (3).md']);
  });

  it('has nothing to hand over when there is nothing to write', () => {
    expect(writePagesAsMarkdownFiles([])).toEqual([]);
  });
});
