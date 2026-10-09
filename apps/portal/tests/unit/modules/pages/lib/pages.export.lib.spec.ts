import { describe, expect, it } from 'bun:test';
import { buildPagesExportFileName } from '@/modules/pages/export/lib/pages.export.lib';

const MARKDOWN = 'text/markdown; charset=utf-8';
const ARCHIVE = 'application/zip';

describe('buildPagesExportFileName', () => {
  it('names the file after what was exported', () => {
    expect(buildPagesExportFileName('Manual de bienvenida', MARKDOWN)).toBe('manual-de-bienvenida.md');
  });

  it('drops accents and punctuation so the name travels between systems', () => {
    expect(buildPagesExportFileName('Diseño: fase 1 (borrador)', MARKDOWN)).toBe('diseno-fase-1-borrador.md');
  });

  it('falls back to a plain name when nothing usable is left', () => {
    expect(buildPagesExportFileName('¿?¡!', MARKDOWN)).toBe('export.md');
  });

  it('leaves no dash at either end, even when the cut falls right after one', () => {
    expect(buildPagesExportFileName('--¡Hola!--', MARKDOWN)).toBe('hola.md');
    expect(buildPagesExportFileName(`${'a'.repeat(79)} b`, MARKDOWN)).toBe(`${'a'.repeat(79)}.md`);
  });

  /** El nombre llega del backend: uno lleno de signos no puede tardar el cuadrado de su largo. */
  it('names what was exported at once, however many signs it carries', () => {
    const startedAt = performance.now();
    buildPagesExportFileName(`${'-'.repeat(50_000)}x`, MARKDOWN);

    expect(performance.now() - startedAt).toBeLessThan(100);
  });

  it('keeps the name short enough for any file system', () => {
    const veryLong = 'a'.repeat(200);

    expect(buildPagesExportFileName(veryLong, MARKDOWN).length).toBeLessThanOrEqual(84);
  });

  /**
   * One page comes back as Markdown and several come back packed. Only the
   * answer knows which happened, so the ending follows the answer and not what
   * was asked for.
   */
  it('ends the name as an archive when what came back is many pages packed', () => {
    expect(buildPagesExportFileName('Engineering', ARCHIVE)).toBe('engineering.zip');
  });
});
