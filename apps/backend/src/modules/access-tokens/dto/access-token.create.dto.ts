import { ACCESS_TOKEN_NAME_MAX_LENGTH } from '@company-brain/shared';
import { Transform } from 'class-transformer';
import { IsISO8601, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAccessTokenDto {
  /**
   * Para qué es, dicho por quien lo crea: «Claude en mi portátil», «el bot del equipo».
   * Se recorta antes de validar, para que un nombre hecho solo de espacios no pase por lleno.
   */
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(ACCESS_TOKEN_NAME_MAX_LENGTH)
  name!: string;

  /** Cuándo deja de servir. Sin fecha, sirve hasta que se revoca. */
  @IsISO8601({ strict: true })
  @IsOptional()
  expiresAt?: string;

  /** Qué puede hacer y dónde. La forma la revisa el dominio con el catálogo compartido. */
  @IsObject()
  access!: Record<string, unknown>;
}
