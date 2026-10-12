import { describe, expect, it } from 'bun:test';
import { USER_ROLE } from '@neuma/shared';
import type { IStorageProvider } from '../../../../src/common/types/storage.types';
import { FileAccessDeniedError, FileStorageError } from '../../../../src/modules/files/domain/files.error';
import { FilesService } from '../../../../src/modules/files/files.service';
import type {
  CreateFileAssetInput,
  FileAssetRepository,
  FileLogger,
} from '../../../../src/modules/files/types/files.types';

const asset = {
  checksum: 'checksum',
  deletedAt: null,
  id: 'asset-id',
  lifecycle: 'ACTIVE' as const,
  mimeType: 'text/plain',
  originalFilename: 'notes.txt',
  ownerId: 'owner-id',
  pageId: 'page-id',
  size: 5,
  storageKey: 'generated.txt',
  workspaceId: 'workspace-id',
};

const buildRepository = (overrides: Partial<FileAssetRepository> = {}): FileAssetRepository => ({
  canAttachToContent: () => Promise.resolve(true),
  create: () => Promise.resolve(asset),
  findAccessible: () => Promise.resolve(asset),
  findByPage: () => Promise.resolve([]),
  markDeleted: () => Promise.resolve(true),
  ...overrides,
});

const buildStorage = (overrides: Partial<IStorageProvider> = {}): IStorageProvider => ({
  delete: () => Promise.resolve(),
  read: () => Promise.resolve(Buffer.from('notes')),
  save: () => Promise.resolve(asset.storageKey),
  ...overrides,
});

const buildCapturingLogger = (): { logger: FileLogger; logs: Record<string, unknown>[] } => {
  const logs: Record<string, unknown>[] = [];
  return { logger: { error: (context) => logs.push(context) }, logs };
};

const buildService = (
  repositoryOverrides: Partial<FileAssetRepository> = {},
  storageOverrides: Partial<IStorageProvider> = {},
  logger: FileLogger = { error: () => undefined },
): FilesService => new FilesService(buildRepository(repositoryOverrides), buildStorage(storageOverrides), logger);

const expectStorageFailureLogShape = (entry: Record<string, unknown> | undefined): void => {
  expect(Object.keys(entry ?? {})).toEqual(['errorType', 'operation']);
};

const expectSingleStorageFailureLog = (logs: Record<string, unknown>[], operation: string): void => {
  expect(logs).toHaveLength(1);
  expect(logs[0]?.operation).toBe(operation);
  expect(logs[0]?.errorType).toBe('Error');
  expectStorageFailureLogShape(logs[0]);
};

const buildCreateInput = (overrides: Partial<CreateFileAssetInput> = {}): CreateFileAssetInput => ({
  buffer: Buffer.from('notes'),
  mimeType: 'text/plain',
  originalFilename: 'notes.txt',
  ownerId: 'owner-id',
  pageId: 'page-id',
  role: USER_ROLE.WORKER,
  size: 5,
  workspaceId: 'workspace-id',
  ...overrides,
});

describe('FilesService', () => {
  it('denies download when the repository cannot prove content access', async () => {
    const service = buildService({ findAccessible: () => Promise.resolve(null) });

    const result = await service.download('asset-id', 'workspace-id', 'viewer-id', USER_ROLE.CLIENT);

    expect(result.isFail()).toBe(true);
    if (result.isFail()) expect(result.getError()).toBeInstanceOf(FileAccessDeniedError);
  });

  it('marks the asset deleted and cleans storage for an authorized delete', async () => {
    let deletedKey: string | undefined;
    const service = buildService(undefined, {
      delete: (key) => {
        deletedKey = key;
        return Promise.resolve();
      },
    });

    const result = await service.delete('asset-id', 'workspace-id', 'editor-id', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(deletedKey).toBe(asset.storageKey);
  });

  it('denies delete for viewers even when the asset is accessible', async () => {
    let markedDeleted = false;
    const service = buildService({
      canAttachToContent: () => Promise.resolve(false),
      markDeleted: () => {
        markedDeleted = true;
        return Promise.resolve(true);
      },
    });

    const result = await service.delete('asset-id', 'workspace-id', 'viewer-id', USER_ROLE.CLIENT);

    expect(result.isFail()).toBe(true);
    expect(markedDeleted).toBe(false);
  });

  it('denies upload when the content target is inaccessible and does not write storage', async () => {
    let saved = false;
    const service = buildService(
      { canAttachToContent: () => Promise.resolve(false), findAccessible: () => Promise.resolve(null) },
      {
        save: () => {
          saved = true;
          return Promise.resolve(asset.storageKey);
        },
      },
    );

    const result = await service.create(buildCreateInput());

    expect(result.isFail()).toBe(true);
    if (result.isFail()) expect(result.getError()).toBeInstanceOf(FileAccessDeniedError);
    expect(saved).toBe(false);
  });

  it('reports cleanup failures without changing the original storage error', async () => {
    const { logger: cleanupLogger, logs } = buildCapturingLogger();
    const service = buildService(
      { create: () => Promise.reject(new Error('database unavailable')), findAccessible: () => Promise.resolve(null) },
      { delete: () => Promise.reject(new Error('cleanup unavailable')), save: (_buffer, key) => Promise.resolve(key) },
      cleanupLogger,
    );

    const result = await service.create(buildCreateInput());

    expect(result.isFail()).toBe(true);
    if (result.isFail()) expect(result.getError()).toBeInstanceOf(FileStorageError);
    expect(logs).toHaveLength(2);
    expect(logs.map((entry) => entry.operation)).toEqual(['file_asset_create', 'file_asset_storage_cleanup']);
    expect(logs.every((entry) => entry.errorType === 'Error')).toBe(true);
    expectStorageFailureLogShape(logs[0]);
    expectStorageFailureLogShape(logs[1]);
  });

  it('reports download storage failures without exposing asset context', async () => {
    const { logger: downloadLogger, logs } = buildCapturingLogger();
    const service = buildService(
      undefined,
      { read: () => Promise.reject(new Error('read unavailable')) },
      downloadLogger,
    );

    const result = await service.download('asset-id', 'workspace-id', 'viewer-id', USER_ROLE.CLIENT);

    expect(result.isFail()).toBe(true);
    if (result.isFail()) expect(result.getError()).toBeInstanceOf(FileStorageError);
    expectSingleStorageFailureLog(logs, 'file_asset_download');
  });

  it('reports delete storage failures without exposing asset context', async () => {
    const { logger: deleteLogger, logs } = buildCapturingLogger();
    const service = buildService(
      undefined,
      { delete: () => Promise.reject(new Error('delete unavailable')) },
      deleteLogger,
    );

    const result = await service.delete('asset-id', 'workspace-id', 'editor-id', USER_ROLE.WORKER);

    expect(result.isFail()).toBe(true);
    if (result.isFail()) expect(result.getError()).toBeInstanceOf(FileStorageError);
    expectSingleStorageFailureLog(logs, 'file_asset_delete');
  });

  it('returns the page attachments when the repository grants access', async () => {
    const metadata = [
      { id: 'asset-id', mimeType: 'text/plain', originalFilename: 'notes.txt', size: 5, uploadedBy: 'Notes Owner' },
    ];
    const service = buildService({ findByPage: () => Promise.resolve(metadata) });

    const result = await service.listByPage('page-id', 'workspace-id', 'viewer-id', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.getValue()).toEqual(metadata);
  });

  it('denies listing attachments when the repository cannot prove page access', async () => {
    const service = buildService({ findByPage: () => Promise.resolve(null) });

    const result = await service.listByPage('page-id', 'workspace-id', 'outsider-id', USER_ROLE.WORKER);

    expect(result.isFail()).toBe(true);
    if (result.isFail()) expect(result.getError()).toBeInstanceOf(FileAccessDeniedError);
  });
});
