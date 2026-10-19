import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { DATABASE_HEALTH_CHECK, HEALTH_READINESS_TIMEOUT_MS } from '../common/constants/health.constants';
import { Public } from '../common/infrastructure/decorators/public.decorator';
import type { DatabaseHealthCheck } from '../common/types/health.types';

@Controller('health')
export class HealthController {
  constructor(@Inject(DATABASE_HEALTH_CHECK) private readonly databaseHealth: DatabaseHealthCheck) {}

  /** Liveness: the process answers. It never touches the database, so a slow Postgres does not restart it. */
  @Public()
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }

  /** Readiness: the process can serve requests, which needs the database. */
  @Public()
  @Get('ready')
  async ready(): Promise<{ status: string }> {
    if (!(await this.databaseHealth.isReachable(HEALTH_READINESS_TIMEOUT_MS))) {
      throw new ServiceUnavailableException('database unreachable');
    }
    return { status: 'ok' };
  }
}
