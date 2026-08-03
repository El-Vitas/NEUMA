import { afterAll, describe, expect, it } from 'bun:test';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { LocalStorageProvider } from '../../../../src/common/infrastructure/storage/local.storage.provider';

const TEST_DIR = join(process.cwd(), 'uploads', 'files-test');

describe('LocalStorageProvider', () => {
  const provider = new LocalStorageProvider(TEST_DIR);

  afterAll(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  it('saves a buffer and returns a URL', async () => {
    const buffer = Buffer.from('test-image-data');
    const url = await provider.save(buffer, 'test-file.jpg', 'image/jpeg');
    expect(url).toContain('/files/test-file.jpg');
  });

  it('file exists on disk after save', async () => {
    const buffer = Buffer.from('test-data');
    await provider.save(buffer, 'exists-test.jpg', 'image/jpeg');
    expect(existsSync(join(TEST_DIR, 'exists-test.jpg'))).toBe(true);
  });

  it('deletes a file by key', async () => {
    await provider.save(Buffer.from('data'), 'delete-me.jpg', 'image/jpeg');
    await provider.delete('delete-me.jpg');
    expect(existsSync(join(TEST_DIR, 'delete-me.jpg'))).toBe(false);
  });

  it('delete does not throw for non-existent file', () => {
    expect(provider.delete('non-existent.jpg')).resolves.toBeUndefined();
  });

  it('rejects path traversal keys and never writes outside the base directory', () => {
    expect(provider.save(Buffer.from('unsafe'), '../outside-path-traversal-test.txt', 'text/plain')).rejects.toThrow();
    expect(existsSync(join(TEST_DIR, '..', 'outside-path-traversal-test.txt'))).toBe(false);
  });

  it('reads a stored file by its storage key', async () => {
    await provider.save(Buffer.from('download-data'), 'download.txt', 'text/plain');

    expect(provider.read('download.txt')).resolves.toEqual(Buffer.from('download-data'));
  });
});
