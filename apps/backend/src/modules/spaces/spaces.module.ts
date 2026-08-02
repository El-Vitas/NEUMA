import { Module } from '@nestjs/common';
import { OutboxRepository } from '../../common/infrastructure/persistence/outbox.repository';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import { SpaceRepository } from './infrastructure/persistence/space.repository';
import { SpacesController } from './spaces.controller';
import { SpacesService } from './spaces.service';

@Module({
  controllers: [SpacesController],
  exports: [SpacesService],
  providers: [OutboxRepository, SpaceRepository, SpacesService, WorkspaceContextService],
})
export class SpacesModule {}
