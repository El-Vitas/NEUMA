import { IsBoolean, IsISO8601, IsOptional } from 'class-validator';

export class SetPageVerificationDto {
  @IsBoolean()
  verified!: boolean;

  /** Left out or sent as `null`, the page is verified with no expiration. */
  @IsOptional()
  @IsISO8601()
  expiresAt?: null | string;
}
