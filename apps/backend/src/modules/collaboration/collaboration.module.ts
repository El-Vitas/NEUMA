import { Module } from '@nestjs/common';
import { CollaborationRepository } from './infrastructure/persistence/collaboration.repository';

@Module({
  exports: [CollaborationRepository],
  providers: [CollaborationRepository],
})
export class CollaborationModule {}
