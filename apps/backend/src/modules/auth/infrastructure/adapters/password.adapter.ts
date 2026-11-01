import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BCRYPT_SALT_ROUNDS } from '../../../../common/constants/env.constants';
import { NOBODY_PASSWORD } from '../../constants/auth.password.constants';

@Injectable()
export class PasswordAdapter {
  private nobodyHash: Promise<string> | null = null;

  constructor(private readonly configService: ConfigService) {}

  async compare(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return Bun.password.verify(plainPassword, hashedPassword);
  }

  /** Spends the time of a real check, so an unknown email cannot be told apart from a wrong password by speed. */
  async compareAgainstNobody(plainPassword: string): Promise<false> {
    this.nobodyHash ??= this.hash(NOBODY_PASSWORD);
    await Bun.password.verify(plainPassword, await this.nobodyHash);
    return false;
  }

  async hash(password: string): Promise<string> {
    return Bun.password.hash(password, { algorithm: 'bcrypt', cost: this.resolveSaltRounds() });
  }

  private resolveSaltRounds(): number {
    return this.configService.getOrThrow<number>(BCRYPT_SALT_ROUNDS);
  }
}
