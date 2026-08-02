import { Result } from '@company-brain/shared';
import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResultInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((value: unknown): unknown => {
        if (value instanceof Result) {
          if (value.isFail()) {
            throw value.getError();
          }
          return value.getValue();
        }
        return value;
      }),
    );
  }
}
