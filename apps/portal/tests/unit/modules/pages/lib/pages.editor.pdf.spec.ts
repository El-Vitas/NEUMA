import { describe, expect, it } from 'bun:test';
import { showsPageFileInPlace } from '@/modules/pages/editor/media/lib/pages.editor.file.lib';

describe('which files a page shows where they stand', () => {
  it('shows a document', () => {
    expect(showsPageFileInPlace('manual.pdf', 'application/pdf')).toBe(true);
  });

  /** A file saved before documents were shown in place kept no kind, so its name answers. */
  it('shows one saved before anyone asked what kind it was', () => {
    expect(showsPageFileInPlace('manual.PDF', null)).toBe(true);
    expect(showsPageFileInPlace('manual.pdf', undefined)).toBe(true);
  });

  it('hands over everything else as a file to be saved', () => {
    expect(showsPageFileInPlace('copia.zip', 'application/zip')).toBe(false);
    expect(showsPageFileInPlace('notas.txt', 'text/plain')).toBe(false);
    expect(showsPageFileInPlace(null, null)).toBe(false);
  });

  /** What it was sent as decides, so a document renamed `.txt` is still read where it stands. */
  it('believes what it was sent as before what it was called', () => {
    expect(showsPageFileInPlace('manual.txt', 'application/pdf')).toBe(true);
    expect(showsPageFileInPlace('trampa.pdf', 'text/plain')).toBe(false);
  });
});
