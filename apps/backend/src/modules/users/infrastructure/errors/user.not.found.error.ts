import { HttpException } from '@nestjs/common';

export class UserNotFoundError extends HttpException {
  constructor(_identifier: string) {
    super(
      {
        code: 'USER_NOT_FOUND',
        details: { identifier: _identifier },
        message: 'Usuario no encontrado',
      },
      404,
    );
  }
}
