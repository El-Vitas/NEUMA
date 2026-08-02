import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BCRYPT_SALT_ROUNDS } from '../../../../common/constants/env.constants';
import { BCRYPT_DEFAULT_SALT_ROUNDS } from '../../../../common/constants/security.constants';

@Injectable()
export class PasswordAdapter {
  constructor(private readonly configService: ConfigService) {}

  async compare(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return Bun.password.verify(plainPassword, hashedPassword);
  }

  async hash(password: string): Promise<string> {
    return Bun.password.hash(password, { algorithm: 'bcrypt', cost: this.resolveSaltRounds() });
  }

  private resolveSaltRounds(): number {
    const raw = this.configService.get<string>(BCRYPT_SALT_ROUNDS);
    if (raw === undefined) {
      return BCRYPT_DEFAULT_SALT_ROUNDS;
    }
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return BCRYPT_DEFAULT_SALT_ROUNDS;
    }
    return parsed;
  }
}
