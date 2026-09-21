import { IsObject } from 'class-validator';

export class UpdateAccessTokenAccessDto {
  /** Lo que el token pasa a tener dado, entero: reemplaza lo anterior, no se le suma. */
  @IsObject()
  access!: Record<string, unknown>;
}
