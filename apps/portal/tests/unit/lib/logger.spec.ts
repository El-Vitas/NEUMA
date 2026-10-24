import { describe, expect, it } from 'bun:test';
import pino from 'pino';
import { LOGGER_REDACT_PATHS } from '@/shared/constants/logger.constants';

const logOnce = (entry: object): string => {
  let written = '';
  const probe = pino(
    { redact: { censor: '[REDACTED]', paths: LOGGER_REDACT_PATHS } },
    {
      write: (line: string) => {
        written += line;
      },
    },
  );
  probe.info(entry);
  return written;
};

describe('logger redaction', () => {
  it('hides a top-level email', () => {
    expect(logOnce({ email: 'ana@example.com' })).not.toContain('ana@example.com');
  });

  it('hides an email nested one level down', () => {
    expect(logOnce({ params: { email: 'ana@example.com' } })).not.toContain('ana@example.com');
  });

  it('hides what a person typed into the search box', () => {
    expect(logOnce({ params: { query: 'salary review' } })).not.toContain('salary review');
  });
});
