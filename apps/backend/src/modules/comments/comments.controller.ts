import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { CommentView, DiscussionPageView, DiscussionView } from '@neuma/shared';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { BlockWriteThrottlerGuard } from '../../common/infrastructure/guards/block-write-throttler.guard';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import type { BlockAccessViewer } from '../../common/types/block-access.types';
import { CommentsService } from './comments.service';
import { ListPageDiscussionsDto } from './dto/comment.list-discussions.dto';
import { OpenDiscussionDto } from './dto/comment.open-discussion.dto';
import { WriteCommentDto } from './dto/comment.write.dto';

/** Discussions of a block and the comments in them. Who may do what is decided by the block, in the service. */
@Controller()
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Get('pages/:pageId/discussions')
  async listPageDiscussions(
    @Param('pageId') pageId: string,
    @Query() query: ListPageDiscussionsDto,
    @User('payload') payload: TokenPayload,
  ): Promise<DiscussionPageView> {
    const result = await this.commentsService.listPageDiscussions(await this.readViewer(payload), pageId, {
      cursor: query.cursor,
      includeResolved: query.includeResolved,
      limit: query.limit,
    });
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Get('discussions/:discussionId')
  async getDiscussion(
    @Param('discussionId') discussionId: string,
    @User('payload') payload: TokenPayload,
  ): Promise<DiscussionView> {
    const result = await this.commentsService.getDiscussion(await this.readViewer(payload), discussionId);
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Post('blocks/:blockId/discussions')
  @UseGuards(BlockWriteThrottlerGuard)
  async openDiscussion(
    @Param('blockId') blockId: string,
    @Body() dto: OpenDiscussionDto,
    @User('payload') payload: TokenPayload,
  ): Promise<DiscussionView> {
    const result = await this.commentsService.openDiscussion(await this.readViewer(payload), blockId, dto);
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Post('discussions/:discussionId/comments')
  @UseGuards(BlockWriteThrottlerGuard)
  async reply(
    @Param('discussionId') discussionId: string,
    @Body() dto: WriteCommentDto,
    @User('payload') payload: TokenPayload,
  ): Promise<DiscussionView> {
    const result = await this.commentsService.reply(await this.readViewer(payload), discussionId, dto.body);
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Post('discussions/:discussionId/resolve')
  @UseGuards(BlockWriteThrottlerGuard)
  async resolve(
    @Param('discussionId') discussionId: string,
    @User('payload') payload: TokenPayload,
  ): Promise<DiscussionView> {
    const result = await this.commentsService.resolve(await this.readViewer(payload), discussionId);
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Post('discussions/:discussionId/reopen')
  @UseGuards(BlockWriteThrottlerGuard)
  async reopen(
    @Param('discussionId') discussionId: string,
    @User('payload') payload: TokenPayload,
  ): Promise<DiscussionView> {
    const result = await this.commentsService.reopen(await this.readViewer(payload), discussionId);
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Patch('comments/:commentId')
  @UseGuards(BlockWriteThrottlerGuard)
  async edit(
    @Param('commentId') commentId: string,
    @Body() dto: WriteCommentDto,
    @User('payload') payload: TokenPayload,
  ): Promise<CommentView> {
    const result = await this.commentsService.edit(await this.readViewer(payload), commentId, dto.body);
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Delete('comments/:commentId')
  @UseGuards(BlockWriteThrottlerGuard)
  async remove(
    @Param('commentId') commentId: string,
    @User('payload') payload: TokenPayload,
  ): Promise<{ readonly discussionRemoved: boolean }> {
    const result = await this.commentsService.remove(await this.readViewer(payload), commentId);
    if (result.isFail()) throw result.getError();
    return { discussionRemoved: result.getValue().discussionRemoved };
  }

  private async readViewer(payload: TokenPayload): Promise<BlockAccessViewer> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    return { role: payload.role, userId: payload.sub, workspaceId: workspace.id };
  }
}
