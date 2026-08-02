import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import type { IStorageProvider } from '../../types/storage.types';

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  constructor(private readonly basePath: string = join(process.cwd(), 'uploads', 'files')) {}

  save(buffer: Buffer, filename: string, _mimeType: string): Promise<string> {
    if (!existsSync(this.basePath)) {
      mkdirSync(this.basePath, { recursive: true });
    }

    const filePath = join(this.basePath, filename);
    writeFileSync(filePath, buffer);

    return Promise.resolve(`/api/v1/files/${filename}`);
  }

  delete(key: string): Promise<void> {
    const filePath = join(this.basePath, key);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }

    return Promise.resolve();
  }
}
