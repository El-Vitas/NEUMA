import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { Injectable } from '@nestjs/common';
import type { IStorageProvider } from '../../types/storage.types';

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  constructor(private readonly basePath: string = join(process.cwd(), 'uploads', 'file-assets')) {}

  async save(buffer: Buffer, filename: string, _mimeType: string): Promise<string> {
    const filePath = this.resolveStoragePath(filename);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    return `/api/v1/files/${filename}`;
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.resolveStoragePath(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolveStoragePath(key), { force: true });
  }

  private resolveStoragePath(key: string): string {
    if (key.length === 0 || isAbsolute(key) || key.includes('\0') || key.includes('\\')) {
      throw new Error('Invalid storage key');
    }
    const basePath = resolve(this.basePath);
    const filePath = resolve(basePath, key);
    const relativePath = relative(basePath, filePath);
    if (relativePath.length === 0 || relativePath === '..' || relativePath.startsWith(`..${sep}`)) {
      throw new Error('Invalid storage key');
    }
    return filePath;
  }
}
