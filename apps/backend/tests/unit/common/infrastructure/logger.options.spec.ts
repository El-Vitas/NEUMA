import { describe, expect, it } from 'bun:test';
import pino from 'pino';
import { buildLogOptions } from '@/common/infrastructure/logger.options';

/** Lo que el log escribe de un objeto, tal cual saldría. */
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

  /** Un correo o una llave que viajan dentro de otro objeto son igual de personales. */
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
