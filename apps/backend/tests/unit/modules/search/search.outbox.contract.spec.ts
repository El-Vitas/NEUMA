import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repositoryPath = resolve(process.cwd(), 'src/common/infrastructure/persistence/outbox.repository.ts');
const pageRepositoryPath = resolve(process.cwd(), 'src/modules/pages/infrastructure/persistence/page.repository.ts');

describe('search outbox projection contract', () => {
  test('claims pending and expired processing events atomically with a bounded lease', () => {
    const source = readFileSync(repositoryPath, 'utf8');
    const constants = readFileSync(resolve(process.cwd(), 'src/common/constants/outbox.constants.ts'), 'utf8');
    const limitPlaceholder = ['LIMIT ', '${', 'boundedLimit}'].join('');

    expect(constants).toContain('OUTBOX_MAX_CLAIM_BATCH_SIZE = 100');
    expect(constants).toContain('OUTBOX_LEASE_SECONDS = 300');
    expect(constants).toContain('OUTBOX_RETRY_BASE_SECONDS = 5');
    expect(source).toContain('OUTBOX_MAX_CLAIM_BATCH_SIZE');
    expect(source).toContain('OUTBOX_LEASE_SECONDS');
    expect(source).toContain('OUTBOX_RETRY_BASE_SECONDS');

    expect(source).toContain('FOR UPDATE SKIP LOCKED');
    expect(source).toContain(limitPlaceholder);
    expect(source).toContain('\'PROCESSING\'::"OutboxStatus"');
    expect(source).toContain(['make_interval(secs => ${', 'OUTBOX_LEASE_SECONDS})'].join(''));
  });

  test('records retry metadata without exposing the raw error object', () => {
    const source = readFileSync(repositoryPath, 'utf8');

    expect(source).toContain('safeErrorMessage');
    expect(source).toContain('lastError');
    expect(source).toContain("redactionLabel = 'removed'");
    expect(source).toContain('payload: event.payload');
  });

  test('defines durable lastError storage for outbox failures', () => {
    const model = readFileSync(
      resolve(process.cwd(), '../../packages/db/prisma/models/outbox-event.model.prisma'),
      'utf8',
    );
    const migration = readFileSync(
      resolve(process.cwd(), '../../packages/db/prisma/migrations/20260802030000_outbox_error_metadata/migration.sql'),
      'utf8',
    );

    expect(model).toContain('lastError      Json?');
    expect(migration).toContain('ADD COLUMN "lastError" JSONB');
  });

  test('emits page events inside repository transactions', () => {
    const source = readFileSync(pageRepositoryPath, 'utf8');

    expect(source).toContain("eventType: 'PAGE_CREATED'");
    expect(source).toContain("eventType: 'PAGE_UPDATED'");
    expect(source).toContain("eventType: 'PAGE_MOVED'");
    expect(source).toContain('outboxRepository.create');
    expect(source).toContain('transaction,');
  });
});
