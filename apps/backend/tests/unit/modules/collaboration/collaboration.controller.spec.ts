import { describe, expect, test } from 'bun:test';
import { ValidationPipe } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '@/common/infrastructure/guards/jwt.auth.guard';
import { CollaborationController } from '@/modules/collaboration/collaboration.controller';
import { CollaborationTokenDto } from '@/modules/collaboration/dto/collaboration.token.dto';

describe('CollaborationController', () => {
  test('requires the current authenticated user guard for the token endpoint', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, CollaborationController) as readonly unknown[];

    expect(guards).toContain(JwtAuthGuard);
  });

  test('rejects malformed page ids for the token endpoint', () => {
    const validationPipe = new ValidationPipe();

    expect(() =>
      validationPipe.transform(
        { mode: 'read', pageId: 'page-1' },
        { data: '', metatype: CollaborationTokenDto, type: 'body' },
      ),
    ).toThrow();
  });
});
