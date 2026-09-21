import { API_SEGMENTS, type AuthSession, RESOURCE_ROUTES } from '@company-brain/shared';
import { Body, Controller, Delete, HttpCode, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import { HTTP_STATUS_CREATED, HTTP_STATUS_NO_CONTENT } from '../../common/constants/http.constants';
import { THROTTLER_NAMES } from '../../common/constants/throttler.constants';
import { Public } from '../../common/infrastructure/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { UserInterceptor } from '../../common/infrastructure/interceptors/user.interceptor';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshSessionDto } from './dto/refresh.session.dto';

@Controller(RESOURCE_ROUTES.AUTH)
export class AuthController {
  constructor(readonly authService: AuthService) {}

  /**
   * Counted, because this is a door that opens with a guess.
   *
   * Nothing here needs a session to be reached, so nothing but the count
   * stands between a patient machine and every password it cares to try.
   */
  @HttpCode(HTTP_STATUS_CREATED)
  @Post(API_SEGMENTS.SESSIONS)
  @Public()
  /* Cada cuenta dice bajo qué cuentas está: la de exportar es de otra puerta y no tiene nada que ver con esta. */
  @SkipThrottle({ [THROTTLER_NAMES.exports]: true })
  @UseGuards(ThrottlerGuard)
  async login(@Body() dto: LoginDto): Promise<AuthSession> {
    const result = await this.authService.loginUser(dto);
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }

  @HttpCode(HTTP_STATUS_CREATED)
  @Post(`${API_SEGMENTS.SESSIONS}/${API_SEGMENTS.REFRESH}`)
  @Public()
  @SkipThrottle({ [THROTTLER_NAMES.exports]: true })
  @UseGuards(ThrottlerGuard)
  async refresh(@Body() dto: RefreshSessionDto): Promise<AuthSession> {
    const result = await this.authService.refreshSession(dto.refreshToken);
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }

  @Delete(`${API_SEGMENTS.SESSIONS}/${API_SEGMENTS.CURRENT}`)
  @HttpCode(HTTP_STATUS_NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(UserInterceptor)
  logout(): void {
    this.authService.logoutUser();
  }
}
