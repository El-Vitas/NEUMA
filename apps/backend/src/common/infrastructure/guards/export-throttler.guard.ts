import { Injectable } from '@nestjs/common';
import { THROTTLER_NAMES } from '../../constants/throttler.constants';
import { UserThrottlerGuard } from './user-throttler.guard';

@Injectable()
export class ExportThrottlerGuard extends UserThrottlerGuard {
  protected readonly enforcedThrottlers = [THROTTLER_NAMES.exports];
}
