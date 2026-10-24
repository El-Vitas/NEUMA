import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { NotificationPageView } from '@neuma/shared';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import type { BlockAccessViewer } from '../../common/types/block-access.types';
import { ListNotificationsDto } from './dto/notification.list.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Get()
  async list(
    @Query() query: ListNotificationsDto,
    @User('payload') payload: TokenPayload,
  ): Promise<NotificationPageView> {
    return this.notificationsService.list(await this.readViewer(payload), {
      cursor: query.cursor,
      limit: query.limit,
      unreadOnly: query.unreadOnly,
    });
  }

  @Get('unread-count')
  async countUnread(@User('payload') payload: TokenPayload): Promise<{ readonly count: number }> {
    return { count: await this.notificationsService.countUnread(await this.readViewer(payload)) };
  }

  @Post('read-all')
  async readAll(@User('payload') payload: TokenPayload): Promise<{ readonly count: number }> {
    return { count: await this.notificationsService.markAllRead(await this.readViewer(payload)) };
  }

  @Post(':notificationId/read')
  async read(
    @Param('notificationId') notificationId: string,
    @User('payload') payload: TokenPayload,
  ): Promise<{ readonly id: string }> {
    const result = await this.notificationsService.markRead(await this.readViewer(payload), notificationId);
    if (result.isFail()) throw result.getError();
    return { id: notificationId };
  }

  private async readViewer(payload: TokenPayload): Promise<BlockAccessViewer> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    return { role: payload.role, userId: payload.sub, workspaceId: workspace.id };
  }
}
