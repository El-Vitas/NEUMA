import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { Injectable } from '@nestjs/common';
import type { IStorageProvider } from '../../types/storage.types';

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  constructor(private readonly basePath: string = join(process.cwd(), 'uploads', 'file-assets')) {}

  save(buffer: Buffer, filename: string, _mimeType: string): Promise<string> {
    return Promise.resolve().then(() => {
      const filePath = this.resolveStoragePath(filename);
      if (!existsSync(this.basePath)) mkdirSync(this.basePath, { recursive: true });
      const parentPath = resolve(filePath, '..');
      if (!existsSync(parentPath)) mkdirSync(parentPath, { recursive: true });
      writeFileSync(filePath, buffer);
      return `/api/v1/files/${filename}`;
    });
  }

  read(key: string): Promise<Buffer> {
    return Promise.resolve().then(() => readFileSync(this.resolveStoragePath(key)));
  }

  delete(key: string): Promise<void> {
    return Promise.resolve().then(() => {
      const filePath = this.resolveStoragePath(key);
      if (existsSync(filePath)) unlinkSync(filePath);
    });
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
