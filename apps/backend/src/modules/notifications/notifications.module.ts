import { Module } from '@nestjs/common';
import { BlockAccessRepository } from '../../common/infrastructure/persistence/block-access.repository';
import { BlockAudienceRepository } from '../../common/infrastructure/persistence/block-audience.repository';
import { BlockPageLocator } from '../../common/infrastructure/persistence/block-page.locator';
import { NotificationWriter } from '../../common/infrastructure/persistence/notification.writer';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import { BlocksModule } from '../blocks/blocks.module';
import { NOTIFICATION_REPOSITORY, TEXT_MENTION_REPOSITORY } from './constants/notifications.constants';
import { TextMentionListener } from './infrastructure/listeners/text-mention.listener';
import { NotificationRepository } from './infrastructure/persistence/notification.repository';
import { TextMentionRepository } from './infrastructure/persistence/text-mention.repository';
import { NotificationRetentionScheduler } from './infrastructure/schedulers/notification.retention.scheduler';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { TextMentionService } from './text-mention.service';

@Module({
  controllers: [NotificationsController],
  exports: [NotificationRetentionScheduler, NotificationsService],
  imports: [BlocksModule],
  providers: [
    BlockAccessRepository,
    BlockAudienceRepository,
    BlockPageLocator,
    NotificationRepository,
    { provide: NOTIFICATION_REPOSITORY, useExisting: NotificationRepository },
    NotificationRetentionScheduler,
    NotificationsService,
    NotificationWriter,
    TextMentionListener,
    TextMentionRepository,
    { provide: TEXT_MENTION_REPOSITORY, useExisting: TextMentionRepository },
    TextMentionService,
    WorkspaceContextService,
  ],
})
export class NotificationsModule {}
