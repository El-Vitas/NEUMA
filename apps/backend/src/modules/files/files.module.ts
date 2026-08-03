import { Module } from '@nestjs/common';
import { FastifyFileInterceptor } from '../../common/infrastructure/interceptors/fastify-file.interceptor';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import { FILE_ASSET_REPOSITORY } from './constants/files.constants';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { FileAssetRepositoryImpl } from './infrastructure/persistence/file.asset.repository';

@Module({
  controllers: [FilesController],
  providers: [
    FileAssetRepositoryImpl,
    FilesService,
    FastifyFileInterceptor,
    { provide: FILE_ASSET_REPOSITORY, useExisting: FileAssetRepositoryImpl },
    WorkspaceContextService,
  ],
})
export class FilesModule {}
