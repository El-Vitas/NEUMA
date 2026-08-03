import { Module } from '@nestjs/common';
import { OutboxRepository } from '../../common/infrastructure/persistence/outbox.repository';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import { DATABASE_REPOSITORY } from './constants/databases.constants';
import { DatabasesController } from './databases.controller';
import { DatabasesService } from './databases.service';
import { DatabaseRepository } from './infrastructure/persistence/database.repository';

@Module({
  controllers: [DatabasesController],
  exports: [DatabasesService],
  providers: [
    OutboxRepository,
    DatabasesService,
    { provide: DATABASE_REPOSITORY, useClass: DatabaseRepository },
    WorkspaceContextService,
  ],
})
export class DatabasesModule {}
