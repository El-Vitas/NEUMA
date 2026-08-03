import { describe, expect, it } from 'bun:test';
import { USER_ROLE } from '@company-brain/shared';
import type { IStorageProvider } from '../../../../src/common/types/storage.types';
import { FileAccessDeniedError, FileStorageError } from '../../../../src/modules/files/domain/files.error';
import { FilesService } from '../../../../src/modules/files/files.service';
import type { FileAssetRepository, FileLogger } from '../../../../src/modules/files/types/files.types';

const asset = {
  checksum: 'checksum',
  databaseRecordId: null,
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

describe('FilesService', () => {
  const logger: FileLogger = {
    error: () => undefined,
  };

  it('denies download when the repository cannot prove content access', async () => {
    const repository: FileAssetRepository = {
      canAttachToContent: () => Promise.resolve(false),
      create: () => Promise.resolve(asset),
      findAccessible: () => Promise.resolve(null),
      markDeleted: () => Promise.resolve(true),
    };
    const storage: IStorageProvider = {
      delete: () => Promise.resolve(),
      read: () => Promise.resolve(Buffer.from('notes')),
      save: () => Promise.resolve(asset.storageKey),
    };
    const service = new FilesService(repository, storage, logger);

    const result = await service.download('asset-id', 'workspace-id', 'viewer-id', USER_ROLE.CLIENT);

    expect(result.isFail()).toBe(true);
    if (result.isFail()) expect(result.getError()).toBeInstanceOf(FileAccessDeniedError);
  });

  it('marks the asset deleted and cleans storage for an authorized delete', async () => {
    let deletedKey: string | undefined;
    const repository: FileAssetRepository = {
      canAttachToContent: () => Promise.resolve(true),
      create: () => Promise.resolve(asset),
      findAccessible: () => Promise.resolve(asset),
      markDeleted: () => Promise.resolve(true),
    };
    const storage: IStorageProvider = {
      delete: (key) => {
        deletedKey = key;
        return Promise.resolve();
      },
      read: () => Promise.resolve(Buffer.from('notes')),
      save: () => Promise.resolve(asset.storageKey),
    };
    const service = new FilesService(repository, storage, logger);

    const result = await service.delete('asset-id', 'workspace-id', 'editor-id', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(deletedKey).toBe(asset.storageKey);
  });

  it('denies delete for viewers even when the asset is accessible', async () => {
    let markedDeleted = false;
    const repository: FileAssetRepository = {
      canAttachToContent: () => Promise.resolve(false),
      create: () => Promise.resolve(asset),
      findAccessible: () => Promise.resolve(asset),
      markDeleted: () => {
        markedDeleted = true;
        return Promise.resolve(true);
      },
    };
    const storage: IStorageProvider = {
      delete: () => Promise.resolve(),
      read: () => Promise.resolve(Buffer.from('notes')),
      save: () => Promise.resolve(asset.storageKey),
    };
    const service = new FilesService(repository, storage, logger);

    const result = await service.delete('asset-id', 'workspace-id', 'viewer-id', USER_ROLE.CLIENT);

    expect(result.isFail()).toBe(true);
    expect(markedDeleted).toBe(false);
  });

  it('denies upload when the content target is inaccessible and does not write storage', async () => {
    let saved = false;
    const repository: FileAssetRepository = {
      canAttachToContent: () => Promise.resolve(false),
      create: () => Promise.resolve(asset),
      findAccessible: () => Promise.resolve(null),
      markDeleted: () => Promise.resolve(true),
    };
    const storage: IStorageProvider = {
      delete: () => Promise.resolve(),
      read: () => Promise.resolve(Buffer.from('notes')),
      save: () => {
        saved = true;
        return Promise.resolve(asset.storageKey);
      },
    };
    const service = new FilesService(repository, storage, logger);

    const result = await service.create({
      buffer: Buffer.from('notes'),
      databaseRecordId: null,
      mimeType: 'text/plain',
      originalFilename: 'notes.txt',
      ownerId: 'owner-id',
      pageId: 'page-id',
      role: USER_ROLE.WORKER,
      size: 5,
      workspaceId: 'workspace-id',
    });

    expect(result.isFail()).toBe(true);
    if (result.isFail()) expect(result.getError()).toBeInstanceOf(FileAccessDeniedError);
    expect(saved).toBe(false);
  });

  it('reports cleanup failures without changing the original storage error', async () => {
    const logs: Record<string, unknown>[] = [];
    const cleanupLogger: FileLogger = {
      error: (context) => logs.push(context),
    };
    const repository: FileAssetRepository = {
      canAttachToContent: () => Promise.resolve(true),
      create: () => Promise.reject(new Error('database unavailable')),
      findAccessible: () => Promise.resolve(null),
      markDeleted: () => Promise.resolve(true),
    };
    const storage: IStorageProvider = {
      delete: () => Promise.reject(new Error('cleanup unavailable')),
      read: () => Promise.resolve(Buffer.from('notes')),
      save: (_buffer, key) => Promise.resolve(key),
    };
    const service = new FilesService(repository, storage, cleanupLogger);

    const result = await service.create({
      buffer: Buffer.from('notes'),
      databaseRecordId: null,
      mimeType: 'text/plain',
      originalFilename: 'notes.txt',
      ownerId: 'owner-id',
      pageId: 'page-id',
      role: USER_ROLE.WORKER,
      size: 5,
      workspaceId: 'workspace-id',
    });

    expect(result.isFail()).toBe(true);
    if (result.isFail()) expect(result.getError()).toBeInstanceOf(FileStorageError);
    expect(logs).toHaveLength(2);
    expect(logs.map((entry) => entry.operation)).toEqual(['file_asset_create', 'file_asset_storage_cleanup']);
    expect(logs.every((entry) => entry.errorType === 'Error')).toBe(true);
    expect(Object.keys(logs[0] ?? {})).toEqual(['errorType', 'operation']);
    expect(Object.keys(logs[1] ?? {})).toEqual(['errorType', 'operation']);
  });

  it('reports download storage failures without exposing asset context', async () => {
    const logs: Record<string, unknown>[] = [];
    const downloadLogger: FileLogger = {
      error: (context) => logs.push(context),
    };
    const repository: FileAssetRepository = {
      canAttachToContent: () => Promise.resolve(true),
      create: () => Promise.resolve(asset),
      findAccessible: () => Promise.resolve(asset),
      markDeleted: () => Promise.resolve(true),
    };
    const storage: IStorageProvider = {
      delete: () => Promise.resolve(),
      read: () => Promise.reject(new Error('read unavailable')),
      save: () => Promise.resolve(asset.storageKey),
    };
    const service = new FilesService(repository, storage, downloadLogger);

    const result = await service.download('asset-id', 'workspace-id', 'viewer-id', USER_ROLE.CLIENT);

    expect(result.isFail()).toBe(true);
    if (result.isFail()) expect(result.getError()).toBeInstanceOf(FileStorageError);
    expect(logs).toHaveLength(1);
    expect(logs[0]?.operation).toBe('file_asset_download');
    expect(logs[0]?.errorType).toBe('Error');
    expect(Object.keys(logs[0] ?? {})).toEqual(['errorType', 'operation']);
  });

  it('reports delete storage failures without exposing asset context', async () => {
    const logs: Record<string, unknown>[] = [];
    const deleteLogger: FileLogger = {
      error: (context) => logs.push(context),
    };
    const repository: FileAssetRepository = {
      canAttachToContent: () => Promise.resolve(true),
      create: () => Promise.resolve(asset),
      findAccessible: () => Promise.resolve(asset),
      markDeleted: () => Promise.resolve(true),
    };
    const storage: IStorageProvider = {
      delete: () => Promise.reject(new Error('delete unavailable')),
      read: () => Promise.resolve(Buffer.from('notes')),
      save: () => Promise.resolve(asset.storageKey),
    };
    const service = new FilesService(repository, storage, deleteLogger);

    const result = await service.delete('asset-id', 'workspace-id', 'editor-id', USER_ROLE.WORKER);

    expect(result.isFail()).toBe(true);
    if (result.isFail()) expect(result.getError()).toBeInstanceOf(FileStorageError);
    expect(logs).toHaveLength(1);
    expect(logs[0]?.operation).toBe('file_asset_delete');
    expect(logs[0]?.errorType).toBe('Error');
    expect(Object.keys(logs[0] ?? {})).toEqual(['errorType', 'operation']);
  });
});
