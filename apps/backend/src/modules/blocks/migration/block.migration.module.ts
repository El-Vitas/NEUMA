import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from '../../../common/config/env.schema';
import { PrismaModule } from '../../../prisma/prisma.module';
import { BlockMigrationBatchesService } from './block.migration.batches.service';
import { BlockMigrationPlanService } from './block.migration.plan.service';
import { BlockMigrationService } from './block.migration.service';
import { BlockMigrationRepository } from './infrastructure/persistence/block.migration.repository';

/** Only what the one-off command needs: the configuration, the database and the migration itself. */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: (config) => envSchema.parse(config) }), PrismaModule],
  providers: [BlockMigrationRepository, BlockMigrationBatchesService, BlockMigrationPlanService, BlockMigrationService],
})
export class BlockMigrationModule {}
