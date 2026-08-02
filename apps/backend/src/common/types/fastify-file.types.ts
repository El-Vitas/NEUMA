import type { FastifyRequest } from 'fastify';

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface RequestWithUploadedFile extends FastifyRequest {
  uploadedFile?: UploadedFile;
}
