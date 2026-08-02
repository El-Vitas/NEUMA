import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/infrastructure/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }
}
