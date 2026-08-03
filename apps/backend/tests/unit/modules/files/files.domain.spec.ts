import { describe, expect, it } from 'bun:test';
import { normalizeFilename, validateFileUpload } from '../../../../src/modules/files/domain/files.domain';
import { FileValidationError } from '../../../../src/modules/files/domain/files.error';

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

  it('rejects unsupported MIME types', () => {
    expect(() => validateFileUpload({ filename: 'script.js', mimetype: 'application/javascript', size: 100 })).toThrow(
      FileValidationError,
    );
  });
});
