import { describe, expect, it } from 'bun:test';
import pino from 'pino';
import { buildLogOptions } from '@/common/infrastructure/logger.options';

const writtenLine = (object: Record<string, unknown>): string => {
  const lines: string[] = [];
  const logger = pino(buildLogOptions('info'), {
    write: (line: string) => {
      lines.push(line);
    },
  });
  logger.info(object, 'something happened');
  return lines.join('');
};

describe('buildLogOptions', () => {
  it('hides a secret written at the top of what is logged', () => {
    const line = writtenLine({ email: 'ana@example.com', token: 'cbk_secret' });

    expect(line).not.toContain('ana@example.com');
    expect(line).not.toContain('cbk_secret');
  });

  it('keeps what people search for out of the logged request address', () => {
    const line = writtenLine({ req: { method: 'GET', url: '/api/v1/search?query=salary+of+ana&cursor=abc' } });

    expect(line).toContain('/api/v1/search');
    expect(line).not.toContain('salary');
    expect(line).not.toContain('cursor');
  });

  it('hides a secret written one level down, inside another object', () => {
    const line = writtenLine({
      user: { email: 'ana@example.com', password: 'hunter2' },
      session: { token: 'cbk_inner' },
    });

    expect(line).not.toContain('ana@example.com');
    expect(line).not.toContain('hunter2');
    expect(line).not.toContain('cbk_inner');
    expect(line).toContain('something happened');
  });
});
