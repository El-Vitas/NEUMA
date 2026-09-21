import { Injectable } from '@nestjs/common';
import { THROTTLER_NAMES } from '../../constants/throttler.constants';
import { ScopedThrottlerGuard } from './scoped-throttler.guard';

/**
 * Las puertas que se abren con una adivinanza: entrar, renovar la sesión y
 * crear una cuenta. Responden a la cuenta por dirección y a la cuenta
 * compartida, y a ninguna otra.
 */
@Injectable()
export class CredentialsThrottlerGuard extends ScopedThrottlerGuard {
  protected readonly enforcedThrottlers = [THROTTLER_NAMES.perIp, THROTTLER_NAMES.global];
}
