import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Logger } from 'nestjs-pino';
import { NODE_ENV_KEY } from '../../constants/env.constants';
import { INTERNAL_ERROR_CODE, INTERNAL_ERROR_MESSAGE } from '../../constants/error.constants';
import { HTTP_STATUS_CODE_MAP } from '../../constants/http.status.constants';
import { DomainError } from '../../domain/domain.error';
import type { Envelope, EnvelopeBody } from '../../types/http.exception.types';

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly isProduction: boolean;

  constructor(
    private readonly logger: Logger,
    configService: ConfigService,
  ) {
    this.isProduction = configService.get<string>(NODE_ENV_KEY) === 'production';
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const envelope = this.buildEnvelope(exception);

    if (!this.isProduction) {
      this.logDebug(exception, request, envelope);
    }

    response.header('Content-Type', 'application/json; charset=utf-8');
    response.status(envelope.status).send({
      error: envelope.body,
    });
  }

  private buildEnvelope(exception: unknown): Envelope {
    if (exception instanceof DomainError) {
      return {
        body: {
          code: exception.code,
          details: exception.details,
          message: exception.message,
        },
        status: exception.httpStatus,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      return {
        body: this.fromHttpException(status, payload),
        status,
      };
    }

    return {
      body: { code: INTERNAL_ERROR_CODE, message: INTERNAL_ERROR_MESSAGE },
      status: 500,
    };
  }

  private fromHttpException(status: number, payload: string | object): EnvelopeBody {
    const code = HTTP_STATUS_CODE_MAP[status] ?? 'HTTP_ERROR';
    if (typeof payload === 'string') {
      return { code, message: payload };
    }
    const errorField = this.readErrorField(payload);
    const messageField = this.readMessageField(payload);
    const details = this.readDetails(payload);
    const normalizedMessage = this.normalizeMessage(messageField, errorField, status);
    return { code, details, message: normalizedMessage };
  }

  private readErrorField(payload: object): string | undefined {
    if (!('error' in payload)) return;
    const value = (payload as Record<string, unknown>).error;
    return typeof value === 'string' ? value : undefined;
  }

  private readMessageField(payload: object): unknown {
    if (!('message' in payload)) return;
    return (payload as Record<string, unknown>).message;
  }

  private readDetails(payload: object): Record<string, unknown> | undefined {
    const { error: _error, message: _message, ...rest } = payload as Record<string, unknown>;
    return Object.keys(rest).length > 0 ? rest : undefined;
  }

  private logDebug(exception: unknown, request: FastifyRequest, envelope: Envelope): void {
    const isDomain = exception instanceof DomainError;
    const isHttp = exception instanceof HttpException;
    if (isDomain || isHttp) return;
    this.logger.error(
      {
        code: envelope.body.code,
        err: exception instanceof Error ? exception : new Error(String(exception)),
        method: request.method,
        path: request.url,
        status: envelope.status,
      },
      'Unhandled error',
    );
  }

  private normalizeMessage(message: unknown, error: string | undefined, status: number): string {
    if (typeof message === 'string') return message;
    if (Array.isArray(message) && message.every((m) => typeof m === 'string')) {
      return message.join('; ');
    }
    if (error !== undefined) return error;
    return HTTP_STATUS_CODE_MAP[status] ?? 'Error';
  }
}
