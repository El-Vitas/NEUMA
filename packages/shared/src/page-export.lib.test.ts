import { describe, expect, it } from 'bun:test';
import { type PageForExport, writePageAsMarkdownFile, writePagesAsMarkdownFiles } from './page-export.lib.js';
import { type PageContent, pageContentSchema } from './schemas/page-content.schema.js';

const saying = (words: string): PageContent =>
  pageContentSchema.parse({
    content: [{ content: [{ text: words, type: 'text' }], type: 'paragraph' }],
    schemaVersion: 1,
    type: 'doc',
  });

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

  it('trims the dots and blanks a name ends in, and keeps the ones inside it', () => {
    const files = writePagesAsMarkdownFiles([page('Notas . . ...', 'uno'), page('v1.2 final', 'dos')]);

    expect(files.map((file) => file.path)).toEqual(['Notas.md', 'v1.2 final.md']);
  });

  /** Guards against quadratic time on a title full of dots that do not end the name. */
  it('names a page full of dots at once', () => {
    const startedAt = performance.now();
    writePagesAsMarkdownFiles([page(`${'.'.repeat(50_000)}x`, 'uno')]);

    expect(performance.now() - startedAt).toBeLessThan(100);
  });

  it('puts a daughter inside a folder named after her mother', () => {
    const files = writePagesAsMarkdownFiles([
      page('Madre', 'arriba'),
      page('Hija', 'medio', ['Madre']),
      page('Nieta', 'abajo', ['Madre', 'Hija']),
    ]);

    expect(files.map((file) => file.path)).toEqual(['Madre.md', 'Madre/Hija.md', 'Madre/Hija/Nieta.md']);
  });

  it('takes out what would break a path, and nothing else', () => {
    const files = writePagesAsMarkdownFiles([page('Ventas / Chile: 2026', 'x')]);

    expect(files[0]?.path).toBe('Ventas Chile 2026.md');
  });

  it('lets a page keep its accents and its spaces, because a file name carries them fine', () => {
    const files = writePagesAsMarkdownFiles([page('Diseño y año', 'x')]);

    expect(files[0]?.path).toBe('Diseño y año.md');
  });

  it('does not leave a name ending where a file system would refuse it', () => {
    const files = writePagesAsMarkdownFiles([page('Borrador...', 'x')]);

    expect(files[0]?.path).toBe('Borrador.md');
  });

  it('gives the second of two sisters with one name a file of her own', () => {
    const files = writePagesAsMarkdownFiles([page('Acta', 'una'), page('Acta', 'otra'), page('Acta', 'tercera')]);

    expect(files.map((file) => file.path)).toEqual(['Acta.md', 'Acta (2).md', 'Acta (3).md']);
  });

  it('has nothing to hand over when there is nothing to write', () => {
    expect(writePagesAsMarkdownFiles([])).toEqual([]);
  });
});
