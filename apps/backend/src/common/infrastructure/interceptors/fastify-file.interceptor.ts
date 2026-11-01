import {
  BadRequestException,
  type CallHandler,
  createParamDecorator,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { Observable } from 'rxjs';
import {
  FILE_TOO_LARGE_ERROR_CODE,
  FILE_TOO_LARGE_MESSAGE,
  MULTIPART_LIMIT_ERROR_CODES,
  MULTIPART_LIMIT_MESSAGE,
} from '../../constants/storage.constants';
import type { RequestWithUploadedFile, UploadedFile } from '../../types/fastify-file.types';

const readErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  return typeof error.code === 'string' ? error.code : undefined;
};

const isFileTooLargeError = (error: unknown): boolean => readErrorCode(error) === FILE_TOO_LARGE_ERROR_CODE;

const isMultipartLimitError = (error: unknown): boolean => {
  const code = readErrorCode(error);
  return code !== undefined && MULTIPART_LIMIT_ERROR_CODES.has(code);
};

/** The multipart plugin reports its limits as plain errors, which the global filter would turn into a 500. */
const readFirstFile = async (request: RequestWithUploadedFile): ReturnType<FastifyRequest['file']> => {
  try {
    return await request.file();
  } catch (error) {
    if (isMultipartLimitError(error)) {
      throw new PayloadTooLargeException(MULTIPART_LIMIT_MESSAGE);
    }
    throw error;
  }
};

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
    const part = await readFirstFile(request);
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
