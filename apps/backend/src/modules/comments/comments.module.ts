import { Module } from '@nestjs/common';
import { BlockAccessRepository } from '../../common/infrastructure/persistence/block-access.repository';
import { BlockAudienceRepository } from '../../common/infrastructure/persistence/block-audience.repository';
import { BlockPageLocator } from '../../common/infrastructure/persistence/block-page.locator';
import { NotificationWriter } from '../../common/infrastructure/persistence/notification.writer';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { COMMENT_REPOSITORY } from './constants/comments.constants';
import { CommentRepository } from './infrastructure/persistence/comment.repository';

@Module({
  controllers: [CommentsController],
  exports: [CommentsService],
  providers: [
    BlockAccessRepository,
    BlockAudienceRepository,
    BlockPageLocator,
    CommentRepository,
    { provide: COMMENT_REPOSITORY, useExisting: CommentRepository },
    CommentsService,
    NotificationWriter,
    WorkspaceContextService,
  ],
})
export class CommentsModule {}
