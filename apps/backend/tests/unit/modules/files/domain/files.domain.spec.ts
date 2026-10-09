import { describe, expect, it } from 'bun:test';
import { describeFileDisposition, normalizeFilename, validateFileUpload } from '@/modules/files/domain/files.domain';
import { FileValidationError } from '@/modules/files/domain/files.error';

describe('files domain', () => {
  it('normalizes path segments and unsafe characters from an original filename', () => {
    expect(normalizeFilename('../../Quarterly report (final).pdf')).toBe('Quarterly-report-final.pdf');
  });

  it('rejects an empty filename after normalization', () => {
    expect(() => normalizeFilename('..////')).toThrow(FileValidationError);
  });

  it('rejects uploads larger than the file asset limit', () => {
    expect(() =>
      validateFileUpload({ filename: 'report.pdf', mimetype: 'application/pdf', size: 10 * 1024 * 1024 + 1 }),
    ).toThrow(FileValidationError);
  });

  it('accepts what a page can play, so a recording is not turned away at the door', () => {
    expect(validateFileUpload({ filename: 'demo.mp4', mimetype: 'video/mp4', size: 100 })).toBe('demo.mp4');
    expect(validateFileUpload({ filename: 'nota.mp3', mimetype: 'audio/mpeg', size: 100 })).toBe('nota.mp3');
  });

  it('rejects unsupported MIME types', () => {
    expect(() => validateFileUpload({ filename: 'script.js', mimetype: 'application/javascript', size: 100 })).toThrow(
      FileValidationError,
    );
  });
});

describe('describeFileDisposition', () => {
  it('hands over a document a page can show in place to be read where it is', () => {
    expect(describeFileDisposition('application/pdf', 'manual.pdf')).toBe("inline; filename*=UTF-8''manual.pdf");
  });

  it('hands over everything else to be saved', () => {
    expect(describeFileDisposition('application/zip', 'copia.zip')).toBe("attachment; filename*=UTF-8''copia.zip");
    expect(describeFileDisposition('video/webm', 'demo.webm')).toBe("attachment; filename*=UTF-8''demo.webm");
  });

  it('says the name in a way that survives the journey', () => {
    expect(describeFileDisposition('application/pdf', 'informe anual ñ.pdf')).toBe(
      "inline; filename*=UTF-8''informe%20anual%20%C3%B1.pdf",
    );
  });
});
