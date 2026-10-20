import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import pino, { type Logger } from 'pino';
import { buildLogOptions } from '../../../common/infrastructure/logger.options';
import { BlockMigrationModule } from './block.migration.module';
import { BlockMigrationService } from './block.migration.service';
import {
  BLOCK_MIGRATION_EXIT_CODE_FAILURE,
  BLOCK_MIGRATION_LOG_LEVEL,
  BLOCK_MIGRATION_MODE,
} from './constants/block.migration.constants';
import type {
  BlockMigrationApplyReport,
  BlockMigrationCheckReport,
  BlockMigrationMode,
  BlockMigrationProblem,
  BlockMigrationVerifyReport,
} from './types/block.migration.types';
import { readBlockMigrationMode } from './utils/block.migration.args.utils';

const logger = pino(buildLogOptions(BLOCK_MIGRATION_LOG_LEVEL));

const logProblems = (problems: readonly BlockMigrationProblem[]): void => {
  for (const problem of problems) logger.error(problem, 'Problem found');
};

const logCheckReport = (report: BlockMigrationCheckReport): void => {
  for (const remap of report.remaps) logger.warn(remap, 'A block id is shared between pages and gets a new one');
  logProblems(report.problems);
  logger.info(
    {
      alreadyMigratedPageCount: report.alreadyMigratedPageCount,
      blockCount: report.blockCount,
      danglingLinkCount: report.danglingLinkCount,
      isClean: report.isClean,
      linkCount: report.linkCount,
      pageCount: report.pageCount,
      problemCount: report.problems.length,
      remapCount: report.remaps.length,
    },
    'Check summary',
  );
};

const logVerifyReport = (report: BlockMigrationVerifyReport): void => {
  logProblems(report.problems);
  logger.info(
    {
      blockCount: report.blockCount,
      isClean: report.isClean,
      linkCount: report.linkCount,
      pageCount: report.pageCount,
      problemCount: report.problems.length,
    },
    'Verify summary',
  );
};

const logApplyReport = (report: BlockMigrationApplyReport): void => {
  logCheckReport(report.check);
  logProblems(report.problems);
  if (report.verify !== null) logVerifyReport(report.verify);
  logger.info(
    {
      insertedBlockCount: report.insertedBlockCount,
      insertedLinkCount: report.insertedLinkCount,
      isApplied: report.isApplied,
      migratedPageCount: report.migratedPageCount,
      skippedPageCount: report.skippedPageCount,
    },
    'Apply summary',
  );
};

/** True when the run found nothing that blocks; the exit code follows it. */
const runMode = async (mode: BlockMigrationMode, service: BlockMigrationService, log: Logger): Promise<boolean> => {
  switch (mode) {
    case BLOCK_MIGRATION_MODE.check: {
      const report = await service.check(log);
      logCheckReport(report);
      return report.isClean;
    }
    case BLOCK_MIGRATION_MODE.verify: {
      const report = await service.verify(log);
      logVerifyReport(report);
      return report.isClean;
    }
    default: {
      const report = await service.apply(log);
      logApplyReport(report);
      return report.isApplied;
    }
  }
};

export const runBlockMigration = async (): Promise<void> => {
  const mode = readBlockMigrationMode(process.argv.slice(2));
  if (mode.isFail()) {
    logger.error(mode.getError().message);
    process.exitCode = BLOCK_MIGRATION_EXIT_CODE_FAILURE;
    return;
  }
  const application = await NestFactory.createApplicationContext(BlockMigrationModule, { logger: false });
  try {
    const isSuccessful = await runMode(mode.getValue(), application.get(BlockMigrationService), logger);
    if (!isSuccessful) process.exitCode = BLOCK_MIGRATION_EXIT_CODE_FAILURE;
  } finally {
    await application.close();
  }
};

void runBlockMigration().catch((error: unknown) => {
  logger.error({ err: error }, 'The block migration failed');
  process.exitCode = BLOCK_MIGRATION_EXIT_CODE_FAILURE;
});
