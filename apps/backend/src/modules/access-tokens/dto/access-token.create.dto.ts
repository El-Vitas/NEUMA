import { ACCESS_TOKEN_NAME_MAX_LENGTH } from '@company-brain/shared';
import { Transform } from 'class-transformer';
import { IsISO8601, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAccessTokenDto {
  // Trimmed before validation so a whitespace-only name does not pass as non-empty.
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(ACCESS_TOKEN_NAME_MAX_LENGTH)
  name!: string;

  /** Omitted means the token lives until revoked. */
  @IsISO8601({ strict: true })
  @IsOptional()
  expiresAt?: string;

  @IsObject()
  access!: Record<string, unknown>;
}
