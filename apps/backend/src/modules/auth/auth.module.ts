import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { JWT_SECRET_KEY } from '../../common/constants/auth.constants';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { PermissionsGuard } from '../../common/infrastructure/guards/permissions.guard';
import { UserInterceptor } from '../../common/infrastructure/interceptors/user.interceptor';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordAdapter } from './infrastructure/adapters/password.adapter';
import { TokenAdapter } from './infrastructure/adapters/token.adapter';
import { AuthRepository } from './infrastructure/persistence/auth.repository';

@Global()
@Module({
  controllers: [AuthController],
  exports: [
    AuthService,
    AuthRepository,
    PasswordAdapter,
    TokenAdapter,
    JwtAuthGuard,
    PermissionsGuard,
    UserInterceptor,
    JwtModule,
  ],
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>(JWT_SECRET_KEY),
      }),
    }),
  ],
  providers: [
    AuthService,
    AuthRepository,
    PasswordAdapter,
    TokenAdapter,
    JwtAuthGuard,
    PermissionsGuard,
    UserInterceptor,
  ],
})
export class AuthModule {}
