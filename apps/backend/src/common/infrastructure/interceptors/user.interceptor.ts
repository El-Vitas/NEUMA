import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  UnauthorizedException,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { PrismaService } from '../../../prisma/prisma.service';
import type { RequestUser, TokenPayload } from '../../types/auth.types';

@Injectable()
export class UserInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const authUser = request.user;
    if (authUser === undefined) {
      throw new UnauthorizedException('Autenticación requerida');
    }

    const freshUser = await this.loadUserFromDatabase(authUser.payload);
    authUser.data = freshUser;
    return next.handle();
  }

  private async loadUserFromDatabase(payload: TokenPayload): Promise<NonNullable<RequestUser['data']>> {
    const user = await this.prisma.user.findUnique({
      select: {
        email: true,
        id: true,
        isActive: true,
        name: true,
        role: true,
      },
      where: { id: payload.sub },
    });
    if (user?.isActive !== true) {
      throw new UnauthorizedException('El usuario ya no existe o está inactivo');
    }
    return {
      email: user.email,
      id: user.id,
      name: user.name,
      role: user.role,
    };
  }
}
