import {
  BadRequestException,
  type CallHandler,
  createParamDecorator,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { Observable } from 'rxjs';
import { FILE_TOO_LARGE_ERROR_CODE, FILE_TOO_LARGE_MESSAGE } from '../../constants/storage.constants';
import type { RequestWithUploadedFile, UploadedFile } from '../../types/fastify-file.types';

const isFileTooLargeError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: string }).code === FILE_TOO_LARGE_ERROR_CODE;

const toUploadedFile = async (
  part: NonNullable<Awaited<ReturnType<FastifyRequest['file']>>>,
): Promise<UploadedFile> => {
  const buffer = await part.toBuffer();
  return {
    buffer,
    mimetype: part.mimetype,
    originalname: part.filename,
    size: buffer.length,
  };
};

@Injectable()
export class FastifyFileInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<RequestWithUploadedFile>();
    const part = await request.file();
    if (!part) {
      throw new BadRequestException('Archivo requerido');
    }

    try {
      request.uploadedFile = await toUploadedFile(part);
    } catch (error) {
      if (isFileTooLargeError(error)) {
        throw new BadRequestException(FILE_TOO_LARGE_MESSAGE);
      }
      throw error;
    }
    return next.handle();
  }
}

export const UploadedFastifyFile = createParamDecorator((_data: unknown, context: ExecutionContext): UploadedFile => {
  const request = context.switchToHttp().getRequest<RequestWithUploadedFile>();
  if (!request.uploadedFile) {
    throw new BadRequestException('Archivo requerido');
  }
  return request.uploadedFile;
});
