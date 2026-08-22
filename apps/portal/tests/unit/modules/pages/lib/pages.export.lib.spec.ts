import { describe, expect, it } from 'bun:test';
import { buildPagesExportFileName } from '@/modules/pages/export/lib/pages.export.lib';

describe('buildPagesExportFileName', () => {
  it('names the file after what was exported', () => {
    expect(buildPagesExportFileName('Manual de bienvenida')).toBe('manual-de-bienvenida.md');
  });

  it('drops accents and punctuation so the name travels between systems', () => {
    expect(buildPagesExportFileName('Diseño: fase 1 (borrador)')).toBe('diseno-fase-1-borrador.md');
  });

  it('falls back to a plain name when nothing usable is left', () => {
    expect(buildPagesExportFileName('¿?¡!')).toBe('export.md');
  });

  it('keeps the name short enough for any file system', () => {
    const veryLong = 'a'.repeat(200);

    expect(buildPagesExportFileName(veryLong).length).toBeLessThanOrEqual(83);
  });
});
