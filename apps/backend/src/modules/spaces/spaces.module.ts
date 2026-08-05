import { Module } from '@nestjs/common';
import { OutboxRepository } from '../../common/infrastructure/persistence/outbox.repository';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import { WorkspaceMemberRepository } from '../../common/infrastructure/persistence/workspace-member.repository';
import { SPACE_REPOSITORY } from './constants/spaces.constants';
import { SpaceRepository } from './infrastructure/persistence/space.repository';
import { SpacesController } from './spaces.controller';
import { SpacesService } from './spaces.service';

@Module({
  controllers: [SpacesController],
  exports: [SpacesService],
  providers: [
    OutboxRepository,
    { provide: SPACE_REPOSITORY, useClass: SpaceRepository },
    SpacesService,
    WorkspaceContextService,
    WorkspaceMemberRepository,
  ],
})
export class SpacesModule {}
