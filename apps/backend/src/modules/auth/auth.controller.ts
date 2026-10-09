import { API_SEGMENTS, type AuthSession, RESOURCE_ROUTES } from '@company-brain/shared';
import { Body, Controller, Delete, HttpCode, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { HTTP_STATUS_CREATED, HTTP_STATUS_NO_CONTENT } from '../../common/constants/http.constants';
import { Public } from '../../common/infrastructure/decorators/public.decorator';
import { CredentialsThrottlerGuard } from '../../common/infrastructure/guards/credentials-throttler.guard';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { UserInterceptor } from '../../common/infrastructure/interceptors/user.interceptor';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshSessionDto } from './dto/refresh.session.dto';

@Controller(RESOURCE_ROUTES.AUTH)
export class AuthController {
  constructor(readonly authService: AuthService) {}

  /** Throttled: public and unauthenticated, so the throttle is the only brake on password guessing. */
  @HttpCode(HTTP_STATUS_CREATED)
  @Post(API_SEGMENTS.SESSIONS)
  @Public()
  @UseGuards(CredentialsThrottlerGuard)
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
  @UseGuards(CredentialsThrottlerGuard)
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
