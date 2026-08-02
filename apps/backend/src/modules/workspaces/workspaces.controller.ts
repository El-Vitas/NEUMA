import { Controller, Get, UseGuards } from '@nestjs/common';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import type { TokenPayload } from '../../common/types/auth.types';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get('current')
  @UseGuards(JwtAuthGuard)
  getCurrent(@User('payload') payload: TokenPayload) {
    return this.workspacesService.resolveForUser(payload.sub, payload.role);
  }
}
