import { Controller, Delete, Get, Headers, Param, Post, Query, Res, UseGuards, UseInterceptors } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import {
  FastifyFileInterceptor,
  UploadedFastifyFile,
} from '../../common/infrastructure/interceptors/fastify-file.interceptor';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import type { UploadedFile } from '../../common/types/fastify-file.types';
import { FILE_PARTIAL_CONTENT_STATUS, FILE_RANGE_NOT_SATISFIABLE_STATUS } from './constants/files.constants';
import { describeFileDisposition } from './domain/files.domain';
import { FileAssetQueryDto } from './dto/file.asset.query.dto';
import { FilesService } from './files.service';
import type { FileAssetMetadata } from './types/files.types';
import { readRequestedByteRange } from './utils/files.utils';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Post()
  @UseInterceptors(FastifyFileInterceptor)
  async create(
    @Query() query: FileAssetQueryDto,
    @UploadedFastifyFile() file: UploadedFile,
    @User('payload') payload: TokenPayload,
  ) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.filesService.create({
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalFilename: file.originalname,
      ownerId: payload.sub,
      pageId: query.pageId ?? null,
      role: payload.role,
      size: file.size,
      workspaceId: workspace.id,
    });
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  /**
   * A file is handed over whole, or by the stretch a player asked for.
   *
   * Answering «give me the bytes around minute forty» with the whole file is
   * what leaves a seek bar unable to move: a reader that cannot ask for a piece
   * has to wait for everything before it.
   */
  @Get(':assetId')
  async download(
    @Param('assetId') assetId: string,
    @Headers('range') range: string | undefined,
    @User('payload') payload: TokenPayload,
    @Res() response: FastifyReply,
  ): Promise<void> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.filesService.download(assetId, workspace.id, payload.sub, payload.role);
    if (result.isFail()) throw result.getError();
    const download = result.getValue();
    const size = download.body.length;
    const asked = readRequestedByteRange(range, size);

    response
      .header('Accept-Ranges', 'bytes')
      .header('Content-Type', download.mimeType)
      .header('Content-Disposition', describeFileDisposition(download.mimeType, download.originalFilename));

    switch (asked.kind) {
      case 'part':
        response
          .status(FILE_PARTIAL_CONTENT_STATUS)
          .header('Content-Range', `bytes ${String(asked.start)}-${String(asked.end)}/${String(size)}`)
          .send(download.body.subarray(asked.start, asked.end + 1));
        return;
      case 'unsatisfiable':
        response
          .status(FILE_RANGE_NOT_SATISFIABLE_STATUS)
          .header('Content-Range', `bytes */${String(size)}`)
          .send();
        return;
      default:
        response.send(download.body);
    }
  }

  @Get('page/:pageId')
  async listByPage(
    @Param('pageId') pageId: string,
    @User('payload') payload: TokenPayload,
  ): Promise<FileAssetMetadata[]> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.filesService.listByPage(pageId, workspace.id, payload.sub, payload.role);
    if (result.isFail()) throw result.getError();
    return [...result.getValue()];
  }

  @Delete(':assetId')
  async delete(@Param('assetId') assetId: string, @User('payload') payload: TokenPayload) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.filesService.delete(assetId, workspace.id, payload.sub, payload.role);
    if (result.isFail()) throw result.getError();
    return { deleted: result.getValue() };
  }
}
