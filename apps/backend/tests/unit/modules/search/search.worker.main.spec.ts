import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const workerMainPath = resolve(process.cwd(), 'src/modules/search/infrastructure/worker/search.worker.main.ts');

describe('search worker entrypoint', () => {
  test('boots the existing Nest context and handles graceful signals', () => {
    const source = readFileSync(workerMainPath, 'utf8');

    expect(source).toContain('createApplicationContext(AppModule');
    expect(source).toContain("process.once('SIGINT'");
    expect(source).toContain("process.once('SIGTERM'");
    expect(source).toContain('application.close()');
    expect(source).toContain('pino.destination(2)');
    expect(source).toContain('processBatch');
    expect(source).not.toContain('process.stderr.write');
    expect(source).toContain('workerLogger.error({ err: error }');
  });
});
