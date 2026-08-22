import { Module } from '@nestjs/common';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

@Module({
  controllers: [WorkspacesController],
  exports: [WorkspacesService],
  providers: [WorkspaceContextService, WorkspacesService],
})
export class WorkspacesModule {}
