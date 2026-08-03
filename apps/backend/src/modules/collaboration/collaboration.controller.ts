import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import type { TokenPayload } from '../../common/types/auth.types';
import { CollaborationTokenService } from './collaboration.token.service';
import { CollaborationTokenDto } from './dto/collaboration.token.dto';

@Controller('collaboration')
@UseGuards(JwtAuthGuard)
export class CollaborationController {
  constructor(private readonly collaborationTokenService: CollaborationTokenService) {}

  @Post('token')
  async mintToken(
    @Body() dto: CollaborationTokenDto,
    @User('payload') payload: TokenPayload,
  ): Promise<{ token: string }> {
    const token = await this.collaborationTokenService.mint(dto, payload);
    return { token };
  }
}
