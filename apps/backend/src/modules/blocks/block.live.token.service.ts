import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Result } from '@neuma/shared';
import { JWT_SECRET_KEY } from '../../common/constants/auth.constants';
import {
  BLOCK_LIVE_TOKEN_AUDIENCE,
  BLOCK_LIVE_TOKEN_EXPIRES_IN,
  BLOCK_LIVE_TOKEN_PURPOSE,
} from './constants/block.live.constants';
import { BlockLiveUnauthorizedError } from './domain/block.live.error';
import { blockLiveTokenPayloadSchema } from './schemas/block.live.schemas';
import type { BlockLiveTokenVerifier } from './types/block.live.types';
import type { BlockReader } from './types/blocks.types';

/** Its own audience and purpose keep an access or refresh token from opening the live channel. */
@Injectable()
export class BlockLiveTokenService implements BlockLiveTokenVerifier {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  mint(reader: BlockReader): Promise<string> {
    return this.jwtService.signAsync(
      {
        aud: BLOCK_LIVE_TOKEN_AUDIENCE,
        purpose: BLOCK_LIVE_TOKEN_PURPOSE,
        role: reader.role,
        sub: reader.userId,
        workspaceId: reader.workspaceId,
      },
      { expiresIn: BLOCK_LIVE_TOKEN_EXPIRES_IN, secret: this.configService.getOrThrow<string>(JWT_SECRET_KEY) },
    );
  }

  async verify(token: string): Promise<Result<BlockReader, BlockLiveUnauthorizedError>> {
    try {
      const claims = await this.jwtService.verifyAsync<object>(token, {
        audience: BLOCK_LIVE_TOKEN_AUDIENCE,
        secret: this.configService.getOrThrow<string>(JWT_SECRET_KEY),
      });
      const payload = blockLiveTokenPayloadSchema.safeParse(claims);
      if (!payload.success) return Result.fail(new BlockLiveUnauthorizedError());
      const { role, sub, workspaceId } = payload.data;
      return Result.ok({ role, userId: sub, workspaceId });
    } catch {
      return Result.fail(new BlockLiveUnauthorizedError());
    }
  }
}
