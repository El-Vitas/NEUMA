import { IsBoolean, IsISO8601, IsOptional } from 'class-validator';

export class SetPageVerificationDto {
  @IsBoolean()
  verified!: boolean;

  /** Omitted or `null` means the verification never expires. */
  @IsOptional()
  @IsISO8601()
  expiresAt?: null | string;
}
