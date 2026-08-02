import { type DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { STORAGE_PROVIDER } from '../../constants/storage.constants';
import type { IStorageProvider } from '../../types/storage.types';
import { LocalStorageProvider } from './local.storage.provider';

@Module({})
export class StorageModule {
  static forRoot(): DynamicModule {
    return {
      module: StorageModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: STORAGE_PROVIDER,
          inject: [ConfigService],
          useFactory: (config: ConfigService): IStorageProvider => {
            const provider = config.get<'local' | 's3'>('STORAGE_PROVIDER');
            if (provider === 's3') {
              throw new Error('S3 provider not yet implemented');
            }
            return new LocalStorageProvider();
          },
        },
      ],
      exports: [STORAGE_PROVIDER],
      global: true,
    };
  }
}
