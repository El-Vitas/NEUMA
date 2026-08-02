import { Module } from '@nestjs/common';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import { WorkspaceRepository } from './infrastructure/persistence/workspace.repository';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

@Module({
  controllers: [WorkspacesController],
  exports: [WorkspacesService],
  providers: [WorkspaceContextService, WorkspaceRepository, WorkspacesService],
})
export class WorkspacesModule {}
